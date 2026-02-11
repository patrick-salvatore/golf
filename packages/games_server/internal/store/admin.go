package store

import "context"

func (s *Store) GetAdminPassword() (string, error) {
	return s.Queries.GetAdminConfig(context.Background(), "admin_password")
}
