DROP DATABASE IF EXISTS employee_db;

CREATE DATABASE employee_db;

CREATE TABLE employee_db.department (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
);
-- one->many relationships between department.id -> role.department_id
CREATE TABLE employee_db.role (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(30),
    salary DECIMAL NOT NULL,
    department_id INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES department(id),
    PRIMARY KEY (id)
);
-- one->many relationships between:  role.id -> role_id, id -> manager_id
CREATE TABLE employee_db.employee (
    id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30) NOT NULL,
    role_id INT NOT NULL,
    manager_id INT REFERENCES id,
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (id)
);