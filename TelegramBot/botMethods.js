const TelegramBot = require("node-telegram-bot-api");
const UserDB = require("./UsersDB.js")
let users_arr=[];
let bot = new TelegramBot('***REMOVED***', {polling: true});


const dbInit = async () => {
    try {

        //Initializing db and putting values from table in users_arr array
        UserDB.InitDB(users_arr); 

    } catch (error) {
        console.error("Ошибка инициализации бд:", error);
    }
};

//Creating bot instance


//Commands to show in "Menu" button in telegram chat interface
const commands = [
    {
        command: "start",
        description:"Подписка на бота"
    },
    {
        command: "unsub",
        description:"Отписка от бота"
    },
    {
        command: "echo",
        description: "Скопировать сообщение (тест)"
    }
];
bot.setMyCommands(commands);

//Error handler
bot.on("polling_error", err => console.log(err));

//Subscribe user
bot.onText(/start/, async msg => {
    let user = msg.chat.id;
    if (users_arr.includes(user)) {
        botSendMessage("Вы уже в списке", user);
    } 
    else{
        users_arr.push(user)
        UserDB.add_user(user);
        botSendMessage("Вы подписались", user); 
    }
})

//Delee user from subscribers
bot.onText(/unsub/, async msg => {
    let user = msg.chat.id;
    if (users_arr.includes(user)) {
        users_arr.pop(user)
        UserDB.remove_user(user);
        botSendMessage("Вы отписались", user);
    } 
    else{

        botSendMessage("Вы итак не были подписаны", user); 
    }
})

//Echo command for test
bot.onText(/echo/, async msg => {
    let user = msg.chat.id;
    botSendMessage(msg.text, user);

})
//Send message for all users that are subscribed
const botAllSendMessage = async (message) => {
    users_arr.forEach( (user) => {
        bot.sendMessage(user, message)
    });

}

//Send message to one subscriber
const botSendMessage = ( message, user) => {
    bot.sendMessage(user, message)
}

//Init database when loading file
dbInit();

//Export methods to use hem in other files
module.exports = {
    botSendMessage,
    botAllSendMessage,

}



