const inq = require('inquirer')
const mysql = require('mysql2/promise')

let dbconn = null

async function doDBConn() {
    let user, pass
    await inq.prompt([{name: "dbuser", message: "Please enter your mysql username", default: "root"}]).then((obj)=>{
        user = obj.dbuser
    })
    await inq.prompt([{name: "dbpass", message: "Please enter your mysql password",
        // type: 'password'
        default: 'SaitoHimea(*y)'
    }]).then((obj)=>{
        pass = obj.dbpass
    })
    dbconn = await mysql.createConnection({
        host: '127.0.0.1',
        user: user,
        password: pass,
        database: 'employee_db'
})}


async function askTask() {
    async function viewDepartments() {
        let departments = await dbconn.query(
            `SELECT name, id 
            FROM employee_db.department`
        )
        console.log(departments[0])
    }
    async function viewRoles() {
        let roles = await dbconn.query(
            `SELECT title, role.id AS role_id, name AS department, salary
            FROM employee_db.department 
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id;`
        )
        console.log(roles[0])
    }
    async function viewEmployees() {
        let employees = await dbconn.query(
            `SELECT e.id AS employee_id, e.first_name, e.last_name, title, 
            name as department, salary, 
            CONCAT(m.first_name, ' ', m.last_name) AS manager
            FROM employee_db.department
            INNER JOIN employee_db.role ON employee_db.role.department_id = employee_db.department.id
            INNER JOIN employee_db.employee e ON e.role_id = employee_db.role.id
            INNER JOIN employee_db.employee m ON e.manager_id = m.id;`
        )
        console.log(employees[0])
    }
    async function addDepartment() {
        await inq.prompt([{name: "dept", message: "Enter department name to add."}]).then((obj)=>{
            // check to see if dept exists.
            if (obj.dept.length > 0) {
                `INSERT INTO employeedb.department (name) VALUES ("${obj.dept}")`
            } else {
                addDepartment()
            }
        })
    }
    async function addDepartment() {
        await inq.prompt([{name: "dept", message: "Enter role name to add."}]).then((obj)=>{
            if (obj.dept.length > 0) {
                
            } else {
                addDepartment()
            }
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
                viewDepartments()
                // show a formatted table showing department names and department IDs
                break;
            case "View All Roles":
                viewRoles()
                break;
            case "View All Employees":
                viewEmployees()
                break;
            case "Add A Department":
                addDepartment()
                break;
            case "Add A Role":
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
    departmentsSchema = await dbconn.query('DESCRIBE TABLE employee_db.department')
    // console.log(departmentsSchema)
    await askTask()
}

main()