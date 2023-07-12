const inq = require('inquirer')
const mysql = require('mysql2/promise')
const {printTable} = require('console-table-printer')
require('dotenv').config()

let dbconn = null

async function doDBConn() {
    // let user, pass
    // await inq.prompt([{name: "dbuser", message: "Please enter your mysql username", default: "root"}]).then((obj)=>{
    //     user = obj.dbuser
    // })
    // await inq.prompt([{name: "dbpass", message: "Please enter your mysql password",
    //     // type: 'password'
    //     default: 'leg12ir'
    // }]).then((obj)=>{
    //     pass = obj.dbpass
    // })
    dbconn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: 'employee_db'
})}

async function askTask() {
    async function selectDepartments() {
        let departments = await dbconn.query(
            `SELECT name, id as department_id 
            FROM employee_db.department
            ORDER BY id;`
        )
        printTable(departments[0])
    }
    async function selectRoles() {
        let roles = await dbconn.query(
            `SELECT title AS job_title, role.id AS role_id, name AS department, salary
            FROM employee_db.department 
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            ORDER BY role_id;`
        )
        printTable(roles[0])
    }
    async function selectEmployees() {
        let employees = await dbconn.query(
            `SELECT e.id AS employee_id, e.first_name, e.last_name, title AS job_title, 
            name as department, salary, 
            CONCAT(m.first_name, ' ', m.last_name) AS manager
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            INNER JOIN employee_db.employee e ON e.role_id = employee_db.role.id
            INNER JOIN employee_db.employee m ON e.manager_id = m.id;`
        )
        printTable(employees[0])
    }
    async function insertDepartment(name) {
        if (name.length > 0) {
            let result = await dbconn.query(
                `INSERT INTO employee_db.department (name) VALUES (?)`, name
            )
            if (result[0].warningStatus) {
                throw result
            } else {
                console.log(`Successfully added '${name}' department.`)
                let inserted = await dbconn.query(`SELECT * FROM employee_db.department WHERE id = ?`, result[0].insertId)
                printTable(inserted[0])
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
            printTable(inserted[0])
        }
    }
    async function addDepartment() {
        await inq.prompt([{name: "dept", message: "Enter department name to add.", validate: (title)=>{
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
        let title, salary, department_id
        // we are getting the results of the whole departments table because we'll use it multiple times in multipel ways (caching)
        let departments = await dbconn.query(
            `SELECT name 
            FROM employee_db.department
            ORDER BY id`
        )
        console.log(departments)
        await inq.prompt([
            {name: "title", message: "Enter role title to add.", validate: (title)=>{
                return (typeof title === 'string' && title.length > 0)
            }},
            {name: "salary", message: "Enter yearly salary", type: 'number', validate: (salary)=>{
                return Number.isInteger(salary) || 'Please enter a valid whole number'
            }},
            {name: "department", message: "Which department?", type: 'list', choices: departments[0]}]).then((obj)=>{
                console.log(obj.department)
                dbconn.query(
                    `SELECT id FROM employee_db.department WHERE name = ?`, obj.department
                ).then(result=>{
                    department_id = result[0][0].id
                    insertRole(obj.title, obj.salary, department_id)
                })
                // console.log(obj)
        })
    }
    async function addEmployee() {
        let title, salary, department_id
        // we are getting the results of the whole departments table because we'll use it multiple times in multipel ways (caching)
        let departments = await dbconn.query(
            `SELECT name 
            FROM employee_db.department
            ORDER BY id`
        )
        let roles = await dbconn.query(
            `SELECT title, 
            FROM employee_db.role
            ORDER BY id`
        )
        let managers = await dbconn.query(
            `SELECT e.id AS employee_id, e.first_name, e.last_name, title AS job_title, 
            name as department, salary, 
            CONCAT(e.first_name, ' ', e.last_name) AS manager
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            INNER JOIN employee_db.employee e ON e.role_id = employee_db.role.id
            ORDER BY employee_id;`
        )
        console.log(managers)
        await inq.prompt([
            {name: "first_name", message: "Enter the employee's first name", validate: (fname)=>{
                return (!/^[a-zA-Z]/i.test(fname))
            }},
            {name: "last_name", message: "Enter the employee's last name", validate: (lname)=>{
                return (!/^[a-zA-Z]/i.test(lname))
            }},
            {name: "title", message: "Which role?", type: 'list', choices: roles[0]},
            {name: "manager", message: "Who is their manager?", type: 'list'},
            {name: "salary", message: "Enter yearly salary", type: 'number', validate: (salary)=>{
                return Number.isInteger(salary) || 'Please enter a valid whole number'
            }},
            {name: "department", message: "Which department?", type: 'list', choices: departments[0]}]).then((obj)=>{
                console.log(obj.department)
                dbconn.query(
                    `SELECT id FROM employee_db.department WHERE name = ?`, obj.department
                ).then(result=>{
                    department_id = result[0][0].id
                    insertRole(obj.title, obj.salary, department_id)
                })
                // console.log(obj)
        })
    }

    await inq.prompt([{name: "task", message: "What would you like to do?", type: "list", choices: [
        "View All Departments", "View All Roles", "View All Employees", "Add A Department",
        "Add A Role", "Add An Employee", "Update Employee Role",
        // looks like we're missing the option to change managers.
        // looks like we're missing the option to remove employees.
        // looks like we're missing the option to remove roles.
        // looks like we're missing the option to remove departments.
    ]}]).then((obj)=>{
        switch (obj.task) {
            case "View All Departments":
                selectDepartments()
                // show a formatted table showing department names and department IDs
                break;
            case "View All Roles":
                selectRoles()
                break;
            case "View All Employees":
                selectEmployees()
                break;
            case "Add A Department":
                addDepartment()
                break;
            case "Add A Role":
                addRole()
                break;
            case "Add An Employee":
                break;
            case "Update Employee Role":
                break;
            default:
                break;
        }
    })
}

async function main() {
    await doDBConn()
    // departmentsSchema = await dbconn.query('DESCRIBE TABLE employee_db.department')
    // console.log(departmentsSchema)
    await askTask()
    return 0
}

main()