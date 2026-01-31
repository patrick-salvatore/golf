package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn          *sql.DB
	MigrationsDir string
}

type ColumnInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Pk   int    `json:"pk"` // 1 if part of primary key, 0 otherwise
}

func New(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	if err := conn.Ping(); err != nil {
		return nil, err
	}
	return &DB{conn: conn}, nil
}

func NewFromDB(conn *sql.DB) (*DB, error) {
	return &DB{conn: conn}, nil
}

func (db *DB) logMigration(name string, sql string) {
	if db.MigrationsDir == "" {
		return
	}
	fmt.Printf("%v\n", db.MigrationsDir)

	// Create migrations directory if it doesn't exist
	if err := os.MkdirAll(db.MigrationsDir, 0755); err != nil {
		fmt.Printf("Warning: Failed to create migrations dir: %v\n", err)
		return
	}

	timestamp := time.Now().Format("20060102150405")
	filename := fmt.Sprintf("%s_%s.sql", timestamp, name)
	path := filepath.Join(db.MigrationsDir, filename)

	if err := os.WriteFile(path, []byte(sql+";\n"), 0644); err != nil {
		fmt.Printf("Warning: Failed to write migration file: %v\n", err)
	} else {
		fmt.Printf("Created migration: %s\n", path)
	}
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) GetTables() ([]string, error) {
	rows, err := db.conn.Query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		tables = append(tables, name)
	}
	return tables, nil
}

func (db *DB) GetTableSchema(tableName string) ([]ColumnInfo, error) {
	// PRAGMA table_info is safe to use with parameter binding only in some drivers,
	// but standard database/sql often doesn't support binding for table names in PRAGMAs or FROM clauses.
	// We must sanitize or validate tableName carefully.
	// Since GetTables returns valid names, we should ideally verify tableName exists first.
	// For this tool, we assume input comes from trusted selection logic, but let's double check.

	// Basic injection prevention: quote the identifier
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))

	rows, err := db.conn.Query(fmt.Sprintf("PRAGMA table_info(%s)", safeName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var cid int
		var name, dtype string
		var notnull, pk int
		var dfltValue interface{} // can be null

		if err := rows.Scan(&cid, &name, &dtype, &notnull, &dfltValue, &pk); err != nil {
			return nil, err
		}
		columns = append(columns, ColumnInfo{Name: name, Type: dtype, Pk: pk})
	}
	return columns, nil
}

func (db *DB) QueryTable(tableName string, limit, offset int) ([]map[string]interface{}, error) {
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))

	query := fmt.Sprintf("SELECT * FROM %s LIMIT %d OFFSET %d", safeName, limit, offset)
	rows, err := db.conn.Query(query)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	colNames, _ := rows.Columns()

	result := make([]map[string]interface{}, 0)

	for rows.Next() {
		// Create a slice of interface{} to hold pointers to the values
		values := make([]interface{}, len(colNames))
		valuePtrs := make([]interface{}, len(colNames))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		rowMap := make(map[string]interface{})
		for i, colName := range colNames {
			val := values[i]

			// Convert bytes to string for display if needed, or keep as is
			if b, ok := val.([]byte); ok {
				rowMap[colName] = string(b)
			} else {
				rowMap[colName] = val
			}
		}
		result = append(result, rowMap)
	}

	return result, nil
}

// UpdateRowRequest defines the payload for updating a row
type UpdateRowRequest struct {
	PrimaryKeys map[string]interface{} `json:"pks"`     // Map of PK column name -> value
	Updates     map[string]interface{} `json:"updates"` // Map of column name -> new value
}

func (db *DB) UpdateRow(tableName string, req UpdateRowRequest) error {
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))

	setClauses := []string{}
	args := []interface{}{}

	for col, val := range req.Updates {
		setClauses = append(setClauses, fmt.Sprintf(`"%s" = ?`, strings.ReplaceAll(col, `"`, `""`)))
		args = append(args, val)
	}

	if len(setClauses) == 0 {
		return nil
	}

	whereClauses := []string{}
	for col, val := range req.PrimaryKeys {
		whereClauses = append(whereClauses, fmt.Sprintf(`"%s" = ?`, strings.ReplaceAll(col, `"`, `""`)))
		args = append(args, val)
	}

	if len(whereClauses) == 0 {
		return fmt.Errorf("no primary keys provided for update")
	}

	query := fmt.Sprintf("UPDATE %s SET %s WHERE %s",
		safeName,
		strings.Join(setClauses, ", "),
		strings.Join(whereClauses, " AND "))

	_, err := db.conn.Exec(query, args...)
	return err
}

// CreateRowRequest defines the payload for creating a new row
type CreateRowRequest struct {
	Data map[string]interface{} `json:"data"` // Map of column name -> value
}

func (db *DB) CreateRow(tableName string, req CreateRowRequest) error {
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))

	if len(req.Data) == 0 {
		// Insert generic default row if no data provided
		return fmt.Errorf("no row data provided")
	}

	cols := []string{}
	placeholders := []string{}
	args := []interface{}{}

	for col, val := range req.Data {
		cols = append(cols, fmt.Sprintf(`"%s"`, strings.ReplaceAll(col, `"`, `""`)))
		placeholders = append(placeholders, "?")
		args = append(args, val)
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		safeName,
		strings.Join(cols, ", "),
		strings.Join(placeholders, ", "))

	_, err := db.conn.Exec(query, args...)
	return err
}

// DeleteRowRequest defines the payload for deleting a row
type DeleteRowRequest struct {
	Data map[string]interface{} `json:"data"` // Map of PK column name -> value
}

// DeleteRow deletes a row based on the provided PK(s)
func (db *DB) DeleteRow(tableName string, req DeleteRowRequest) error {
	if len(req.Data) == 0 {
		return fmt.Errorf("no primary key data provided")
	}

	// Escape table name
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))

	// Build WHERE clause
	var whereClauses []string
	var args []interface{}
	for col, val := range req.Data {
		whereClauses = append(whereClauses, fmt.Sprintf(`"%s" = ?`, strings.ReplaceAll(col, `"`, `""`)))
		args = append(args, val)
	}

	query := fmt.Sprintf("DELETE FROM %s WHERE %s", safeName, strings.Join(whereClauses, " AND "))

	_, err := db.conn.Exec(query, args...)
	return err
}

// AddColumnRequest defines the payload for adding a column
type AddColumnRequest struct {
	Name         string      `json:"name"`
	Type         string      `json:"type"`
	NotNull      bool        `json:"notNull"`
	DefaultValue interface{} `json:"defaultValue"`
}

func (db *DB) AddColumn(tableName string, req AddColumnRequest) error {
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))
	safeCol := fmt.Sprintf(`"%s"`, strings.ReplaceAll(req.Name, `"`, `""`))

	// Basic validation
	if req.Name == "" || req.Type == "" {
		return fmt.Errorf("column name and type are required")
	}

	query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", safeName, safeCol, req.Type)

	if req.NotNull {
		query += " NOT NULL"
	}

	if req.DefaultValue != nil {
		// Simple quoting for default value string, or raw if number
		switch v := req.DefaultValue.(type) {
		case string:
			query += fmt.Sprintf(" DEFAULT '%s'", strings.ReplaceAll(v, "'", "''"))
		default:
			query += fmt.Sprintf(" DEFAULT %v", v)
		}
	}

	_, err := db.conn.Exec(query)
	if err == nil {
		db.logMigration(fmt.Sprintf("add_column_%s_to_%s", req.Name, tableName), query)
	}
	return err
}

type IndexInfo struct {
	Name    string   `json:"name"`
	Unique  bool     `json:"unique"`
	Columns []string `json:"columns"`
}

func (db *DB) GetIndexes(tableName string) ([]IndexInfo, error) {
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))

	rows, err := db.conn.Query(fmt.Sprintf("PRAGMA index_list(%s)", safeName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var indexes []IndexInfo

	// Temp storage to iterate later
	type partialIndex struct {
		name   string
		unique bool
	}
	var partials []partialIndex

	for rows.Next() {
		var seq int
		var name string
		var unique int
		var origin string
		var partial int
		if err := rows.Scan(&seq, &name, &unique, &origin, &partial); err != nil {
			return nil, err
		}
		// Skip internal indexes usually
		if !strings.HasPrefix(name, "sqlite_") {
			partials = append(partials, partialIndex{name, unique == 1})
		}
	}
	rows.Close()

	for _, p := range partials {
		idxRows, err := db.conn.Query(fmt.Sprintf("PRAGMA index_info('%s')", strings.ReplaceAll(p.name, "'", "''")))
		if err != nil {
			continue // Skip errors for now
		}

		var cols []string
		for idxRows.Next() {
			var seqno, cid int
			var name string
			if err := idxRows.Scan(&seqno, &cid, &name); err == nil {
				cols = append(cols, name)
			}
		}
		idxRows.Close()

		indexes = append(indexes, IndexInfo{
			Name:    p.name,
			Unique:  p.unique,
			Columns: cols,
		})
	}

	return indexes, nil
}

type CreateIndexRequest struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique"`
}

func (db *DB) CreateIndex(tableName string, req CreateIndexRequest) error {
	safeTable := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))
	safeIndex := fmt.Sprintf(`"%s"`, strings.ReplaceAll(req.Name, `"`, `""`))

	if len(req.Columns) == 0 {
		return fmt.Errorf("columns required")
	}

	safeCols := []string{}
	for _, c := range req.Columns {
		safeCols = append(safeCols, fmt.Sprintf(`"%s"`, strings.ReplaceAll(c, `"`, `""`)))
	}

	uniqueStr := ""
	if req.Unique {
		uniqueStr = "UNIQUE"
	}

	query := fmt.Sprintf("CREATE %s INDEX %s ON %s (%s)",
		uniqueStr, safeIndex, safeTable, strings.Join(safeCols, ", "))

	_, err := db.conn.Exec(query)
	if err == nil {
		db.logMigration(fmt.Sprintf("create_index_%s", req.Name), query)
	}
	return err
}

func (db *DB) DropIndex(indexName string) error {
	safeIndex := fmt.Sprintf(`"%s"`, strings.ReplaceAll(indexName, `"`, `""`))
	query := fmt.Sprintf("DROP INDEX %s", safeIndex)
	_, err := db.conn.Exec(query)
	if err == nil {
		db.logMigration(fmt.Sprintf("drop_index_%s", indexName), query)
	}
	return err
}

// RenameColumnRequest defines the payload for renaming a column
type RenameColumnRequest struct {
	NewName string `json:"newName"`
}

func (db *DB) RenameColumn(tableName, oldName string, req RenameColumnRequest) error {
	safeTable := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))
	safeOld := fmt.Sprintf(`"%s"`, strings.ReplaceAll(oldName, `"`, `""`))
	safeNew := fmt.Sprintf(`"%s"`, strings.ReplaceAll(req.NewName, `"`, `""`))

	if req.NewName == "" {
		return fmt.Errorf("new name required")
	}

	query := fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s", safeTable, safeOld, safeNew)
	_, err := db.conn.Exec(query)
	if err == nil {
		db.logMigration(fmt.Sprintf("rename_column_%s_in_%s", oldName, tableName), query)
	}
	return err
}

func (db *DB) DropColumn(tableName, columnName string) error {
	safeTable := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))
	safeCol := fmt.Sprintf(`"%s"`, strings.ReplaceAll(columnName, `"`, `""`))

	// SQLite supports DROP COLUMN since 3.35.0
	query := fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", safeTable, safeCol)
	_, err := db.conn.Exec(query)
	if err == nil {
		db.logMigration(fmt.Sprintf("drop_column_%s_from_%s", columnName, tableName), query)
	}
	return err
}

// CreateTableRequest defines the payload for creating a new table
type CreateTableColumn struct {
	Name         string      `json:"name"`
	Type         string      `json:"type"`
	NotNull      bool        `json:"notNull"`
	Pk           bool        `json:"pk"`
	DefaultValue interface{} `json:"defaultValue"`
}

type CreateTableRequest struct {
	Name    string              `json:"name"`
	Columns []CreateTableColumn `json:"columns"`
}

func (db *DB) CreateTable(req CreateTableRequest) error {
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(req.Name, `"`, `""`))

	if req.Name == "" {
		return fmt.Errorf("table name required")
	}
	if len(req.Columns) == 0 {
		return fmt.Errorf("at least one column required")
	}

	colDefs := []string{}
	for _, col := range req.Columns {
		safeCol := fmt.Sprintf(`"%s"`, strings.ReplaceAll(col.Name, `"`, `""`))
		def := fmt.Sprintf("%s %s", safeCol, col.Type)

		if col.Pk {
			def += " PRIMARY KEY"
		}
		if col.NotNull {
			def += " NOT NULL"
		}
		if col.DefaultValue != nil {
			switch v := col.DefaultValue.(type) {
			case string:
				if v != "" {
					def += fmt.Sprintf(" DEFAULT '%s'", strings.ReplaceAll(v, "'", "''"))
				}
			default:
				def += fmt.Sprintf(" DEFAULT %v", v)
			}
		}
		colDefs = append(colDefs, def)
	}

	query := fmt.Sprintf("CREATE TABLE %s (%s)", safeName, strings.Join(colDefs, ", "))
	_, err := db.conn.Exec(query)
	if err == nil {
		db.logMigration(fmt.Sprintf("create_table_%s", req.Name), query)
	}
	return err
}

func (db *DB) DropTable(tableName string) error {
	safeName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(tableName, `"`, `""`))
	query := fmt.Sprintf("DROP TABLE %s", safeName)
	_, err := db.conn.Exec(query)
	if err == nil {
		db.logMigration(fmt.Sprintf("drop_table_%s", tableName), query)
	}
	return err
}
