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
                    users_arr.splice(users_arr.indexOf(user,1));
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
    ///*************************************************** */
    this.sendMessage=(user,idx)=>{
        this.bot.sendMessage(user, resend_queue[idx].msg,{parse_mode: 'HTML'})
        .then((tg_mes)=>{
            console.log("succesfuly sent to:"+user);             
            let f_i=resend_queue[idx].fail_id.indexOf(user);
            if(f_i>=0)resend_queue[idx].fail_id.splice(f_i,1);                 
        })
        .catch((reason)=>{
            let f_i = resend_queue[idx].fail_id.indexOf(user);
            let rsn=""+reason;
            if (rsn.includes("chat not found")) {//WRONG USER ID!We have to remove this user for future!
                if (f_i >= 0) resend_queue[idx].fail_id.splice(f_i, 1);
                //resend_queue[idx].sent_i++;
                if (users_arr.includes(user)) {
                    users_arr.splice(users_arr.indexOf(user,1));
                    UserDB.remove_user(user);
                }
            } else {
                if (f_i < 0) resend_queue[idx].fail_id.push(user);
            }           
            console.log(TimeStamp()+": CAN'T send message to user>>"+user)
            console.log("because of reason:>"+rsn);
            console.log("<<<");
        })
        .finally(()=>{
            resend_queue[idx].sent_i++;
            if(resend_queue[idx].sent_i>=resend_queue[idx].receivers_n){// >= for case when some users was acidently removed
                SenderTimer("transmited");
            }
        });
    }
    const QUEUE_MAX_LEN=8;
    const RESEND_INTERVAL_MIN=15;
    const RESEND_MAX_ATTEMPTS=24*60/RESEND_INTERVAL_MIN;//try recend during 1 day
    let resend_queue=[];
    let resend_in_work=0;
    let sender_timer_id;
    let rsi=0;
    ///*************************************************** */
    //in depends of 'caller' value it can be called:
    // timeout - timeout between transmit attempts expired (in case of  absense of internet). Called by itself
    // new - new message added to queue. Called from 'this.sendMessage2All()'
    // transmited - previous transmitting finished. It should be checked if it is succesful or not - i.e. 
    //              we can try to transmit next message or wait some time and make new attempt. Called from this.sendMessage.finally
    function SenderTimer(caller="timeout"){
        console.log(TimeStamp()+"  Sender timer called by >"+caller);
        let tout=RESEND_INTERVAL_MIN*60*1000;//15 minutes to attempt
        if(caller=="new"){;//new message added 
            if(resend_in_work===0){//Queue was empty and no any sending activity before. New message has to be spread
                resend_in_work=1;
                users_arr.forEach( (user) => {
                    TGBot.sendMessage(user, rsi);
                }); 
            }else return; //new message added but previous still in transmitting. Nothing to do
        }else if(caller=="transmited"){// sendMessage() promise evalueted           
            if(resend_queue[rsi].fail_id.length==0 || resend_queue[rsi].ttl<=0){//succsessfuly transmitted to ALL or it was last attempt to transmit of message
                resend_queue.splice(rsi,1);
                if (resend_queue.length == 0) resend_in_work = 0;//no any pending message in queue waiting to be send
                else {//next message from queue started to transmit
                    resend_queue[rsi].receivers_n = users_arr.length;
                    resend_queue[rsi].sent_i = 0;
                    users_arr.forEach((user) => { TGBot.sendMessage(user, rsi); });
                    clearTimeout(sender_timer_id);//need re-arm timer                    
                }
            }else {//wait for timeout and then initiate next attempt to transmit
//clearTimeout(sender_timer_id);
//sender_timer_id=setTimeout(SenderTimer,15000,"timeout");//for test
                if(resend_queue[rsi].sent_i!=0)resend_queue[rsi].ttl=3;//at least somebody received message. So we can reduce attempts just in case of some users unreachable and will failed to send to them 
                return;//go out to wait until timeout
            }            
        }else{//presume caller=="timeout"
            resend_queue[rsi].ttl--;
            resend_queue[rsi].receivers_n = resend_queue[rsi].fail_id.length;
            resend_queue[rsi].sent_i = 0;
            resend_queue[rsi].fail_id.forEach((user) => { TGBot.sendMessage(user, rsi); });
        }        
        if(resend_in_work==1)sender_timer_id=setTimeout(SenderTimer,tout,"timeout");
        else clearTimeout(sender_timer_id);
    }
    ///*************************************************** */
    this.sendMessage2All=(message)=>{
        if(resend_queue.length<QUEUE_MAX_LEN){
            resend_queue.push({
                fail_id:[],
                sent_i:0,
                msg:message,
                receivers_n:users_arr.length,
                ttl:RESEND_MAX_ATTEMPTS
            })
        }
        SenderTimer("new");
    }
}//end TGBot_ pseudo class
const TGBot=new TGBot_();

//Send message for all users that are subscribed
const botAllSendMessage = (message) => {
    TGBot.sendMessage2All(message)
}

//Initialize  when loading file
Init();
/* let tttt=0;//!!!!
(()=>setInterval(()=>
    {
        if(tttt!=0){
            //tttt=0;
            botAllSendMessage(TimeStamp()+"тест ботика");
        }
    },35000))(); */

//Export methods to use hem in other files
module.exports = {
    botAllSendMessage,
}



