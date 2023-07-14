const inq = require('inquirer')
const mysql = require('mysql2/promise')
const {printTable} = require('console-table-printer')
const figlet = require("figlet")
const boxen = require('boxen')

// NOTE: console.table gives output that is misleading.
// such as index(id) | id | first_name | last_name
// this gives duplicate info at best, and unhelpful misleading info with deleted rows and subsequent queries.
// Requiring this is a criteria flaw, and requirement should be re-evaluated.
// Omission of the index(id) column is hacky at best.

require('dotenv').config()

let dbconn = null

// initialize the database.
async function doDBConn() {
    try {
        dbconn = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASS,
            database: 'employee_db'
        })
    } catch (err) {
        if (err.code == "ER_ACCESS_DENIED_ERROR") {
            console.log("MySQL misconfigured.  Please check .env (reference .env.EXAMPLE)")
            process.exit(1)
        }
    }
}

async function banner() {
    await figlet(' Employee \n Manager ', {
        verticalLayout: "full"
    }, function(err, data) {
        console.log(boxen(data))
    })    
}

async function showTable(obj) {
    if (obj.length == 0) {
        console.log(`No entries to show.`)
    } else {
        printTable(obj)
    }
}

async function askTask() {
    async function selectDepartments() {
        let departments = await dbconn.query(
            `SELECT name, id as department_id 
            FROM employee_db.department
            ORDER BY id;`
        )
        showTable(departments[0])
        askTask()
    }
    async function selectRoles() {
        let roles = await dbconn.query(
            `SELECT title AS job_title, role.id AS role_id, name AS department, salary
            FROM employee_db.department 
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            ORDER BY role_id;`
        )
        showTable(roles[0])
        askTask()
    }
    async function selectEmployees() {
        let employees = await dbconn.query(
            `SELECT e.id AS employee_id, e.first_name, e.last_name, title AS job_title, 
            name as department, salary, 
            CONCAT(m.first_name, '⠀', m.last_name) AS manager
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            INNER JOIN employee_db.employee e ON e.role_id = employee_db.role.id
            INNER JOIN employee_db.employee m ON e.manager_id = m.id;`
        )
        showTable(employees[0])
        askTask()
    }
    async function selectEmployeesByManager() {
        let employees = await dbconn.query(
            `SELECT CONCAT(m.first_name, '⠀', m.last_name) AS manager, 
            m.id as manager_id, 
            e.first_name, 
            e.last_name, 
            title AS employee_job_title, 
            name as employee_department, 
            e.id AS employee_id
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            INNER JOIN employee_db.employee e ON e.role_id = employee_db.role.id
            INNER JOIN employee_db.employee m ON e.manager_id = m.id
            ORDER BY manager;`
        )
        showTable(employees[0])
        askTask()
    }
    async function selectEmployeesByDepartment() {
        let employees = await dbconn.query(
            `SELECT name as department,
            e.first_name, 
            e.last_name, 
            title AS employee_job_title, 
            e.id AS employee_id
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            INNER JOIN employee_db.employee e ON e.role_id = employee_db.role.id
            ORDER BY department;`
        )
        showTable(employees[0])
        askTask()
    }
    async function insertDepartment(name) {
        if (name.length > 0) {
            let result = await dbconn.query(
                `INSERT INTO employee_db.department (name) VALUES (?)`, name
            )
            if (result[0].warningStatus) {
                throw result
            } else {
                console.log(`Added ${name} to the database.`)
                let inserted = await dbconn.query(`SELECT * FROM employee_db.department WHERE id = ?`, result[0].insertId)
                showTable(inserted[0])
                askTask()
            }
        }
    }
    async function insertRole(title, salary, department_id) {
        let result = await dbconn.query(
            `INSERT INTO employee_db.role (title, salary, department_id) VALUES (?, ?, ?)`, [title, salary, department_id]
        )
        if (result[0].warningStatus) {
            throw result
        } else {
            console.log(`Successfully added '${title}' role.`)
            let inserted = await dbconn.query(`SELECT * FROM employee_db.role WHERE id = ?`, result[0].insertId)
            showTable(inserted[0])
            askTask()
        }
    }
    async function insertEmployee(first_name, last_name, role_id, manager_id) {
        let result = await dbconn.query(
            `INSERT INTO employee_db.employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)`, [first_name, last_name, role_id, manager_id]
        )
        if (result[0].warningStatus) {
            throw result
        } else {
            console.log(`Successfully added employee '${first_name} ${last_name}'.`)
            let inserted = await dbconn.query(`SELECT * FROM employee_db.employee WHERE id = ?`, result[0].insertId)
            showTable(inserted[0])
            askTask()
        }
    }
    async function updateEmployeeRoleQuery(employee_id, role_id) {
        console.log(employee_id)
        console.log(role_id)
        let result = await dbconn.query(
            `UPDATE employee_db.employee SET role_id = ? WHERE id = ?`, [role_id, employee_id]
        )
        console.log(result[0])
        if (result[0].warningStatus) {
            throw result
        } else {
            console.log(`Successfully updated employee's role.`)
            let updated = await dbconn.query(`SELECT * FROM employee_db.employee WHERE id = ?`, employee_id)
            showTable(updated[0])
            askTask()
        }
    }
    async function addDepartment() {
        await inq.prompt([{name: "dept", message: "What is the name of the department?", validate: (title)=>{
            return (typeof title === 'string' && title.length > 0)
        }}]).then((obj)=>{
            // check to see if a dept name exists.
            if (obj.dept.length > 0) {
                insertDepartment(obj.dept)
            } else {
                addDepartment()
            }
        })
    }
    async function addRole() {
        let department_id
        // we are getting the results of the whole departments table because we'll use it multiple times in multipel ways (caching)
        let departments = await dbconn.query(
            `SELECT name 
            FROM employee_db.department
            ORDER BY id`
        )
        // console.log(departments)
        await inq.prompt([
            {name: "title", message: "What is the name of the role?", validate: (title)=>{
                return (typeof title === 'string' && title.length > 0)
            }},
            {name: "salary", message: "What is the salary of the role?", type: 'number', validate: (salary)=>{
                return Number.isInteger(salary) || 'Please enter a valid whole number'
            }},
            {name: "department", message: "What department does the role belong to?", type: 'list', choices: departments[0]}]).then((obj)=>{
                console.log(obj.department)
                dbconn.query(
                    `SELECT id FROM employee_db.department WHERE name = ?`, obj.department
                ).then(result=>{
                    department_id = result[0][0].id
                    insertRole(obj.title, obj.salary, department_id)
                })
        })
    }
    async function addEmployee() {
        let roles = await dbconn.query(
            `SELECT id, title AS name
            FROM employee_db.role
            ORDER BY id`
        )
        let managers = await dbconn.query(
            `SELECT employee.id AS employee_id, 
            CONCAT(employee.first_name, '⠀', employee.last_name) AS name
            FROM employee_db.employee
            ORDER BY employee_id;`
        )
        managers = [{'name': "None", 'id': null}].concat(managers[0])
        await inq.prompt([
            {name: "first_name", message: "Enter the employee's first name", 
                validate: (fname)=>{
                    return (/^[a-zA-Z]/i.test(fname))
            }},
            {name: "last_name", message: "Enter the employee's last name", 
                validate: (lname)=>{
                    return (/^[a-zA-Z]/i.test(lname))
            }},
            {name: "title", message: "Which role?", type: 'list', choices: roles[0],
            },
            {name: "manager", message: "Who is their manager?", type: 'list', choices: managers, 
            }]).then((obj)=>{
                let manager_id, role_id
                if (obj.manager == 'None') {
                    manager_id = null
                } else {
                    for (let row in managers) {
                        console.log(managers)
                        if (obj.manager == managers[row].name) {
                            manager_id = managers[row].employee_id
                        }
                    }
                }
                for (let row in roles[0]) {
                    if (obj.title == roles[0][row].name) {
                        role_id = roles[0][row].id
                    }
                }
                insertEmployee(obj.first_name, obj.last_name, role_id, manager_id)
        })
    }
    async function updateEmployeeRole() {
        let roles = await dbconn.query(
            `SELECT title AS job_title, 
            role.id AS role_id, 
            name AS department, 
            salary, 
            CONCAT(role.id, ':⠀', title, '⠀in⠀', name, '⠀$', salary, '⠀per yr') AS name
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            ORDER BY role_id;`
        )
        let employees = await dbconn.query(
            `SELECT employee.id AS employee_id, title AS job_title, 
            name as department, salary, 
            CONCAT(employee.id, ':⠀', first_name, '⠀', last_name) AS name
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            INNER JOIN employee_db.employee ON employee.role_id = employee_db.role.id;`
        )
        await inq.prompt([{name: "employee", message: "Select an employee to update roles with.", type: "list",
            choices: employees[0]
        }, {name: "role", message: "Select a new role to give to them.", type: "list", choices: roles[0]
        }]).then((obj)=>{
            let employee_id, role_id
            for (let row in employees[0]) {
                if (obj.employee == employees[0][row].name) {
                    employee_id = employees[0][row].id
                }
            }
            for (let row in roles[0]) {
                if (obj.role == roles[0][row].name) {
                    role_id = roles[0][row].id
                }
            }
            // console.log(`Updating ${obj.employee}'s role to ${obj.role} with ${obj.employee.split(":")[0]} and ${obj.role.split(":")[0]}`)
            updateEmployeeRoleQuery(obj.employee.split(":")[0], obj.role.split(":")[0])
        })
    }
    async function chooseDeleteDepartment() {
        let departments = await dbconn.query(
            `SELECT name,
            id as department_id 
            FROM employee_db.department
            ORDER BY name;`
        )
        await inq.prompt([{name: "department", message: "Select a department to delete.  WARNING: ALL ASSOCIATED ROLES AND EMPLOYEES WILL BE REMOVED.", type: "list",
            choices: departments[0]
        }]).then((obj)=>{
            dbconn.query(
                `SELECT id FROM employee_db.department WHERE name = ?`, obj.department
            ).then((result)=>{
                let department_id = result[0][0].id
                dbconn.query(
                    `DELETE FROM employee_db.department WHERE id = ?`, department_id
                ).then((delResult)=>{
                    if (delResult[0].warningStatus) {
                        throw delResult
                    } else {
                        console.log(`Removed department ${obj.department} from the database.`)
                        askTask()
                    }
                })
            })
        })
    }
    async function chooseDeleteRole() {
        let roles = await dbconn.query(
            `SELECT title AS name,
            id as department_id 
            FROM employee_db.role
            ORDER BY name;`
        )
        await inq.prompt([{name: "role", message: "Select a role to delete.  WARNING: ALL ASSOCIATED EMPLOYEES WILL BE REMOVED.", type: "list",
            choices: roles[0]
        }]).then((obj)=>{
            dbconn.query(
                `SELECT id FROM employee_db.role WHERE title = ?`, obj.role
            ).then((result)=>{
                console.log(result)
                let role_id = result[0][0].id
                dbconn.query(
                    `DELETE FROM employee_db.role WHERE id = ?`, role_id
                ).then((delResult)=>{
                    if (delResult[0].warningStatus) {
                        throw delResult
                    } else {
                        console.log(`Removed role ${obj.role} from the database.`)
                        askTask()
                    }
                })
            })
        })
    }
    async function chooseDeleteEmployee() {
        let employees = await dbconn.query(
            `SELECT employee.id, 
            CONCAT(first_name, '⠀', last_name) AS name
            FROM employee_db.employee
            ORDER BY name;`
        )
        await inq.prompt([{name: "employee", message: "Select an employee to delete.  WARNING.", type: "list",
            choices: employees[0]
        }]).then((obj)=>{
            dbconn.query(
                `SELECT id FROM employee_db.employee WHERE first_name = ? AND last_name = ?`, obj.employee.split("⠀")
            ).then((result)=>{
                console.log(result)
                let employee_id = result[0][0].id
                dbconn.query(
                    `DELETE FROM employee_db.employee WHERE id = ?`, employee_id
                ).then((delResult)=>{
                    if (delResult[0].warningStatus) {
                        throw delResult
                    } else {
                        console.log(`Removed employee ${obj.employee} from the database.`)
                        askTask()
                    }
                })
            })
        })
        
    }

    await inq.prompt([{name: "task", message: "What would you like to do?", type: "list", 
        choices: [
            "View All Departments", "View All Roles", "View All Employees", "View Employees by Manager", 
            "View Employees by Department", "Add A Department",
            "Add A Role", "Add An Employee", "Update Employee Role",
            "Delete Department", "Delete Role", "Delete Employee", 
            // looks like we're missing duplicate checks.
        // looks like we're missing the option to change managers.
        // looks like we're missing the option to remove employees.
        // looks like we're missing the option to remove roles.
        // looks like we're missing the option to remove departments.
            "Quit"
    ]}]).then((obj)=>{
        switch (obj.task) {
            case "View All Departments":
                selectDepartments()
                break;
            case "View All Roles":
                selectRoles()
                break;
            case "View All Employees":
                selectEmployees()
                break;
            case "View Employees by Manager":
                selectEmployeesByManager()
                break;
            case "View Employees by Department":
                selectEmployeesByDepartment()
                break;
            case "Add A Department":
                addDepartment()
                break;
            case "Add A Role":
                addRole()
                break;
            case "Add An Employee":
                addEmployee()
                break;
            case "Update Employee Role":
                updateEmployeeRole()
                break;
            case "Delete Department":
                chooseDeleteDepartment()
                break;
            case "Delete Role":
                chooseDeleteRole()
                break;
            case "Delete Employee":
                chooseDeleteEmployee()
                break;
            case "Quit":
                dbconn.close() 
                return;
            default:
                break;
        }
    })
}

async function main() {
    await banner()
    await doDBConn()
    await askTask()
}

main()