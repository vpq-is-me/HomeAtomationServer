const TelegramBot = require("node-telegram-bot-api");
const UserDB = require("./UsersDB.js")
const fs=require('fs')

let users_arr=[];

const Init = async () => {
    try {
        TGBot.InitTG();
        //Initializing db and putting values from table in users_arr array
        UserDB.InitDB(users_arr);
    } catch (error) {
        console.error("Ошибка инициализации бд:", error);
    }
};
//************************************************************** */
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
// let bot;
//TelegramWaterBot: ***REMOVED***  test
//HomeAutomation_waterPump_bot: ***REMOVED***  home
function TGBot_ (){
    this.id='***REMOVED***';//default is home's bot id
    this.bot;
    this.InitTG=()=>{    
        try{
            this.id=fs.readFileSync('./TelegramBot/bot_id.txt','ascii')
        }catch(error){
            console.error('Can`t open file with telegram bot ID "bot_id.txt": ', error);
        }
        try{
            //Creating bot instance
            this.bot = new TelegramBot(this.id, {polling: true});
            this.bot.setMyCommands(commands);
            //Error handler
            this.bot.on("polling_error", err => console.log(err));
            //Subscribe user
            this.bot.onText(/\/start/, (msg,match) => {
                let user = msg.chat.id;
                if (users_arr.includes(user)) {
                    this.bot.sendMessage(user,"Вы уже в списке");
                } else {
                    users_arr.push(user)
                    UserDB.add_user(user);
                    this.bot.sendMessage(user,"Вы подписались");
                }
            });
            //Delete user from subscribers
            this.bot.onText(/\/unsub/, async msg => {
                let user = msg.chat.id;
                if (users_arr.includes(user)) {
                    users_arr.pop(user)
                    UserDB.remove_user(user);
                    this.bot.sendMessage(user,"Вы отписались");
                } else {
                    this.bot.sendMessage(user,"Вы итак не были подписаны");
                }
            });
            //Echo command for test
            this.bot.onText(/echo/, msg => {
                let user = msg.chat.id;
                this.bot.sendMessage(user,msg.text);
            });
        }catch(error){
            console.error("failure to start telegram bot: ",error);
        }
    }
    this.sendMessage=(user,message)=>{
        this.bot.sendMessage(user, message,{parse_mode: 'HTML'})
    }
    this.sendMessage2All=(message)=>{
        users_arr.forEach( (user) => {
            TGBot.sendMessage(user, message,{parse_mode: 'HTML'})
        });    
    } 
}
const TGBot=new TGBot_();

//Send message for all users that are subscribed
const botAllSendMessage = (message) => {
    TGBot.sendMessage2All(message)
}

//Initialize  when loading file
Init();

//Export methods to use hem in other files
module.exports = {
    botAllSendMessage,
}



