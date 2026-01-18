# GoLang Setup Guide

## Table of Contents
- [GoLang Setup Guide](#golang-setup-guide)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Installations](#installations)
  - [Running Dev Server](#running-dev-server)
  - [Creating Migrations](#creating-migrations)
---

## Prerequisites

- A Unix-like operating system (Linux, macOS, etc.)

## Installations

1. **Download Go**:
   Visit the [Go downloads page](https://golang.org/dl/) and download the latest version for your operating system.

2. **Install Go**:
   Follow the installation instructions based on your OS:

   - **macOS**:
     ```bash
     brew install go
     ```

   - **Windows**:
     Follow the installer instructions provided on the Go downloads page.

3. **Verify Installation**
   
   After installation, check if Go is installed correctly by running:
   ```bash
   go version
   ```

4. **Install Air for Dev**
    ```bash
    go install github.com/air-verse/air@latest
    ```

5. **Configure Your Shell**
  
    - Using PATH. Locate the Go Bin Directory, typically located in $HOME/go/bin.
      ```bash
      export PATH=$PATH:$HOME/go/bin
      ```
  
    - Using shell alias
      ```bash
      alias air='~/go/bin/air'
      ```

6. **Verify Air Installation**:
  After installation, check if Go is installed correctly by running:
  ```bash
  air -version
  ```

## Running Dev Server
```bash
  cd api 
  air
```

OR 

```bash
  make
```

## Creating Migrations
1. Create the migration with `make db-create-migration`
2. edit the sql file with the change to the table
3. execute the migration with `make db-migrate-up`
4. within `db/queries` find the file named with the table that was modified from the migration (or create one if the file doesn’t exist) and modify the (or create) sql statements for the CRUD operations
5. Run make `db-generate`. This will execute the code-gen and create go functions you can use in the request handlers
