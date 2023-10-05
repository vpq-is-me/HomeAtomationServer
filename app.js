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
function ManagerResponser(){
    this.query_res_arr=[];
    this.NewReq=function(req,res){
        this.query_res_arr.push(res);
        unix_client.write(JSON.stringify(req));
    }
    this.Answer=function(payload){
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
        }
    } catch (error) {
        console.error(error);
    }
})
///TODO add telegramm as alarm receiver !!!!
//    tg_bot.botAllSendMessage("cho-kavo");
