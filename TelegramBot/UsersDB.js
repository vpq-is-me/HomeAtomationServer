const sqlite3 = require("sqlite3");
let db;
function InitDB(users){
    db = new sqlite3.Database('./TelegramBot/database.db')
    get_users(users);
 }

const get_users = async (users_arr) => {  
    return new Promise((resolve, reject) => 
        db.all("SELECT chat_id FROM subscribers", [], (err, rows) =>{
            if (err){
                reject()
            }

            rows.forEach( element => {
                users_arr.push( parseInt(element["chat_id"]))
            });
            resolve()
        })
    )      

}


const add_user = (sub) => {

    db.run(`INSERT INTO subscribers (chat_id) VALUES (?)`, [sub], (err) =>{
        if (err){
            return err
        }

    })
}

const remove_user = (sub) => {

    db.run(`DELETE FROM subscribers WHERE chat_id = ?`, [sub], (err) =>{
        if (err){
            return err
        }

    })
}

module.exports = {
    get_users,
    add_user,
    remove_user,
    InitDB

}