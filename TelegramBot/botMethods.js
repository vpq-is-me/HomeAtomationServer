const TelegramBot = require("node-telegram-bot-api");
const UserDB = require("./UsersDB.js")
const fs=require('fs');
const { rejects } = require("assert");

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
///******************************************************************************** */
function TimeStamp(){
    dt=new Date();
    return dt.toLocaleString("ru-RU");
}
///******************************************************************************** */
// let bot;
function TGBot_ (){
    this.id='33';//default is home's bot id
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
            this.bot.on("polling_error", err => console.log("Polling error at "/* +TimeStamp()*/) );
            //Subscribe user
            this.bot.onText(/\/start/, (msg,match) => {
                let user = msg.chat.id;
                if (users_arr.includes(user)) {
                    this.bot.sendMessage(user,TimeStamp()+":Вы уже в списке")
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
    this.sendMessage=(user,idx)=>{
        this.bot.sendMessage(user, resend_queue[idx].msg,{parse_mode: 'HTML'})
        .then((tg_mes)=>{
            resend_queue[idx].success_i++; 
            let idx=resend_queue[idx].fail_id.indexOf(user);
            if(idx>=0)resend_queue[idx].fail_id.splice(idx,1);                 
        })
        .catch((reason)=>{
            let idx=resend_queue[idx].fail_id.indexOf(user);
            if(idx<0)resend_queue[idx].fail_id.push(user);            
            console.log(TimeStamp()+": CAN'T send message to user>>"+user)
        })
        .finally(()=>{
            let l=resend_queue[idx].success_i+resend_queue[idx].fail_id.length;
            if(l==resend_inst.receivers_n){
                console.log(TimeStamp()+": Finish spread message")
            }
        });
    }
    const QUEUE_MAX_LEN=8;
    const RESEND_INTERVAL_MIN=10;
    const RESEND_MAX_ATTEMPTS=24*60/RESEND_INTERVAL_MIN;//try recend during 1 day
    let resend_queue=[];
    let resend_in_work=0;

    this.sendMessage2All=(message)=>{
        console.log(TimeStamp()+": Start spread message to all.")
        if(resend_queue.length<QUEUE_MAX_LEN){
            resend_queue.push({
                fail_id:[],
                success_i:0,
                msg:message,
            })
        }
        resend_inst.receivers_n=users_arr.length;
        resend_inst.success_i=0;
        resend_inst.msg=message;
        resend_inst.fail_id=[];
        users_arr.forEach( (user) => {
            TGBot.sendMessage(user, message,{parse_mode: 'HTML'})
        });    
    }

}//end TGBot_ pseudo class
const TGBot=new TGBot_();

//Send message for all users that are subscribed
const botAllSendMessage = (message) => {
    TGBot.sendMessage2All(message)
}

//Initialize  when loading file
Init();
let tttt=0;//!!!!
(()=>setInterval(()=>
    {
        if(tttt!=0){
            tttt=0;
            botAllSendMessage(TimeStamp()+"писька");
        }
    },1000))();

//Export methods to use hem in other files
module.exports = {
    botAllSendMessage,
}



