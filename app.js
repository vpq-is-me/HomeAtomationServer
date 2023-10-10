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
//TODO limit maximum queuing requests!!!
function ManagerResponser(){
    this.query_res_arr=[];
    this.NewReq=function(req,res){
        this.query_res_arr.push(res);
        unix_client.write(JSON.stringify(req));
    }
    this.Answer=function(payload){
         for(let i=0;i<this.query_res_arr.length;i++){//remove old closed dangling request
            if(this.query_res_arr[i].closed){
                this.query_res_arr.shift();
            }
        }       //TODO !!!! chek dangling request
        if(this.query_res_arr.length===0)return;//it is too late to send somthing
        var res=this.query_res_arr.shift();
        if(typeof(res)!=="undefined"){
            res.send(JSON.stringify(payload));
        }
    }
}
var mng_resp=new ManagerResponser();
//************************************** */
app.post('/basic_trend_data', (req, res) => {
    let down_req = Object.assign({ tag: 3 }, req.body);
    mng_resp.NewReq(down_req,res);
})
//****************** */
app.listen(8080,()=>{
    console.log('server started on port 8080')
});
//************************************************************** */
const net=require('net');
const Stream = require("stream");
const UP2WEB_SOCKET="/tmp/water_pump_socket.socket";

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
        console.log(jrec);
        if ('tag' in jrec) {
            if (jrec.tag === 3) {
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
///TODO add telegramm as alarm receiver !!!!

