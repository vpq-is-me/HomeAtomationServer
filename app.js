const express = require("express");
const app=express();
const tg_bot=require("./TelegramBot/botMethods");


app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(express.static(__dirname +'/css'))
app.use(express.static(__dirname +'/src'))


var rec_buf='';
app.get('/',(req,res)=>{
    res.render('pages/index',{
        received_buf: rec_buf
    });
});

app.get('/jfile', (req,res)=>{
    res.json( rec_buf);
})

app.get('/reset_alarm', (req, res) => {
    unix_client.write(JSON.stringify({ 'tag': TAG_CMDRESETALARM }));
    res.end('reset_done');
})
//************************************* */
const MAX_CLIENT_REQUEST_QUEUE=16;
function ManagerResponser(){
    this.query_res_arr=[];
    this.inprocess=false;
    this.timeout=undefined;
    this.NewReq=function(req,res){
        if(this.query_res_arr.length>MAX_CLIENT_REQUEST_QUEUE)return;
        this.query_res_arr.push({req:req,res:res});
        console.log(`           *** in queue stlill stay ${this.query_res_arr.length} requests`)
        this.ProcNext();
    }
    this.Answer=function(payload){
        clearTimeout(this.timeout);
        var req_res=this.query_res_arr.shift();
        if(typeof(req_res)!=="undefined"){
            req_res.res.send(JSON.stringify(payload));
        } 
        this.inprocess=false;       
        this.ProcNext();
    }
    
    this.ProcNext=function(){
        if(this.inprocess)return;
        if(this.query_res_arr.length===0)return;
        this.timeout=setTimeout(()=>{//if we here than somting in request down to DB had gone wrong
            let req_res=mng_resp.query_res_arr.shift();
            req_res.res.sendStatus(500);
            mng_resp.inprocess=false;
            mng_resp.ProcNext();
        },1000);//max 1 sec to process request to DB
        this.inprocess=true;
        let req_res=this.query_res_arr[0];
        unix_client.write(JSON.stringify(req_res.req));
    }
}
var mng_resp=new ManagerResponser();
//************************************** */
app.post('/basic_trend_data', (req, res) => {
    let down_req = Object.assign({ tag: 3 }, req.body);
    mng_resp.NewReq(down_req,res);
})
//************************************** */
app.post('/alarms', (req, res) => {
    let down_req = Object.assign({ tag: 4 }, req.body);
    mng_resp.NewReq(down_req,res);
})
//****************** */
app.listen(8080,()=>{
    let time=new Date().toLocaleTimeString();
    console.log(time+'  server started on port 8080')
});
//************************************************************** */
const net=require('net');
const UP2WEB_SOCKET="/tmp/water_pump_socket.socket";
const SEPTIC_UP2WEB_SOCKET="/tmp/septic_socket.socket";

var unix_client=net.createConnection(UP2WEB_SOCKET);
const TAG_REQSNAP        =1;
const TAG_CMDRESETALARM  =2;
const TAG_DB_REQUEST     =3;

unix_client.on('connect', () => {
    console.log('Unix socket connected');
    setInterval(() => {
        unix_client.write(JSON.stringify({ 'tag': TAG_REQSNAP }));
    }, 1000);
})
unix_client.on('data', (msg) => {
    try {
        var jrec = JSON.parse(msg.toString());
//DEBUG        console.log(jrec);
        if ('tag' in jrec) {
            if (jrec.tag === 3 || jrec.tag === 4) {
                mng_resp.Answer(jrec);
            }
        } else {
            rec_buf = jrec;
            tg_alarm_disp.Update(jrec.alarms);
        }
    } catch (error) {
        console.error(error);
    }
})
//************************************************************** */
const sept_tout_mask=(1 << 10);
let alarm_bitfields={
    /* WP_ALARM_CHECKVALVE_LEAK */      [1 << 2]:"ВНИМАНИЕ: Проверь обратный клапан",
    /* WP_ALARM_PUMP_CAPACITY_LOW */    [1 << 3]:"ВНИМАНИЕ: Снижена производительность насоса",
    /* WP_ALARM_PUMP_CAPACITY_LOW_LOW */[1 << 4]:"АВАРИЯ: Снижена производительность насоса",
    /* WP_ALARM_BYPASS_SW_ON */         [1 << 5]:"ВНИМАНИЕ: Включен переключатель байпаса на контроллере насаса. НЕ ЗАБУДЬ ВЫКЛЮЧИТЬ!",
    /* WP_ALARM_PUMP_LONG_RUN */        [1 << 6]:"АВАРИЯ: Большая продолжительность работы насоса",
    /* WP_ALARM_FREQUENT_START */       [1 << 7]:"ВНИМАНИЕ: Частое включение насоса",
    /* WP_ALARM_FREQUENT_START_HIGH */  [1 << 8]:"АВАРИЯ: Частое включение насоса",
    /* WP_ALARM_SEPTIC_REQ_SDWN */      [1 << 9]:"АВАРИЯ: Септик переполнен! Не использовать воду!",
    /* WP_ALARM_SEPTIC_NOT_SEND */      [1 << 10]:"ВНИМАНИЕ: Аварийный датчик уровня в септике не отвечает! Проверить состояние септика!",
}
//   let cnt=0;
function TGAlarmDispather(){
    this.prev_alarm_state=0;
    this.Update=function(new_alarm_state){
//   cnt++
//   if(cnt>=2 && cnt<=4)new_alarm_state=16
        /***XX add a 'blind' against 'septic BLE message timeout' alarm. For some reason in water pump there is
         bug that gives above mentioned alarm even septic work properly and send it's message in predifined maner*/
        if(septic_message_tout>=SEPTIC_MAX_TIMEOUT_FROM_LAST_MSG_sec){
            new_alarm_state=new_alarm_state | sept_tout_mask; 
        }else{
            new_alarm_state=new_alarm_state & (~sept_tout_mask);
        }
        /***END XX... */
        if(this.prev_alarm_state!==new_alarm_state){
            let diff=this.prev_alarm_state ^ new_alarm_state;
            for(key in alarm_bitfields){
                let mask=parseInt(key);
                if(mask & diff){
                    if(mask & new_alarm_state){
                        var text='&#x26A0'+'<b>'+alarm_bitfields[key]+'</b>';
                       // var text='<tg-emoji emoji-id="5368324170671202286">&#x26A0</tg-emoji>'+'<b>'+alarm_bitfields[key]+'</b>';
                    }else {
                        var text='&#x2705'+"Аварийный сигнал <b>сброшен :</b>\n"+'<s>'+alarm_bitfields[key]+'</s>';
                    }
                    tg_bot.botAllSendMessage(text);
                }
            }
            this.prev_alarm_state=new_alarm_state;
        }
    }
}

tg_alarm_disp=new TGAlarmDispather();
var septic_message_tout;
const SEPTIC_MAX_TIMEOUT_FROM_LAST_MSG_sec=(30*60);
(function () {
    var con_established=0;
    var sept_unix_client;
    setInterval(() => {
        if(con_established===0){
            console.log("Try to connect to Septic");
            sept_unix_client = net.createConnection(SEPTIC_UP2WEB_SOCKET);
            sept_unix_client.on("error", (err) => {
                console.log(err);
                con_established=0;
                sept_unix_client=undefined;
            })
            sept_unix_client.on('connect',()=>{
                console.log("septic is now connected");
                con_established=1;
            })
            sept_unix_client.on('end',()=>{
                console.log("septic accidantly disconnected");
                con_established=0;
                sept_unix_client=undefined;
            })
            sept_unix_client.on('data',(data)=>{
                //console.log(data.toString());
                var sept_ans = JSON.parse(data.toString());                
                if('msg_timer' in sept_ans){
                    septic_message_tout=sept_ans.msg_timer;
                    if(septic_message_tout>60)
                        console.log(`Septic message timeout ${septic_message_tout}`);
                }                
            })
        }else{
            sept_unix_client.write(JSON.stringify({ 'tag': TAG_REQSNAP, 'val': 'msg_timer' }));   
        }

    }, 3000);//3000
}());
