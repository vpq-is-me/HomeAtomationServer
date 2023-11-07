const alarms_reason_tb = {
    /* WP_ALARM_CHECKVALVE_LEAK */[1 << 2]: "ВНИМАНИЕ: Проверь обратный клапан",
    /* WP_ALARM_PUMP_CAPACITY_LOW */[1 << 3]: "ВНИМАНИЕ: Снижена производительность насоса",
    /* WP_ALARM_PUMP_CAPACITY_LOW_LOW */[1 << 4]: "АВАРИЯ: Снижена производительность насоса",
    /* WP_ALARM_BYPASS_SW_ON */[1 << 5]: "ВНИМАНИЕ: Включен переключатель байпаса на контроллере насаса. НЕ ЗАБУДЬ ВЫКЛЮЧИТЬ!",
    /* WP_ALARM_PUMP_LONG_RUN */[1 << 6]: "АВАРИЯ: Большая продолжительность работы насоса",
    /* WP_ALARM_FREQUENT_START */[1 << 7]: "ВНИМАНИЕ: Частое включение насоса",
    /* WP_ALARM_FREQUENT_START_HIGH */[1 << 8]: "АВАРИЯ: Частое включение насоса",
    /* WP_ALARM_SEPTIC_REQ_SDWN */[1 << 9]: "АВАРИЯ: Септик переполнен! Не использовать воду!",
    /* WP_ALARM_SEPTIC_NOT_SEND */[1 << 10]: "ВНИМАНИЕ: Аварийный датчик уровня в септике не отвечает! Проверить состояние септика!",
}
const ALTAB_MAX_LENGTH=200;

function AlTabAddRow(tab_ref,jdata,idx,row_n,prev_al){
    let row=tab_ref.insertRow(row_n);

    let c1=row.insertCell();
    let tm=new Date(jdata.data.date[idx]*1000);
    c1.innerText=tm.toLocaleString("ru-RU",{timeZone: "UTC"});
    
    let c2=row.insertCell();
    c2.innerHTML="";
    let c3=row.insertCell();
    c3.innerHTML="";
    let c4=row.insertCell();
    c4.innerHTML="";
    let al=jdata.data.alarms[idx];
    let chng=al^prev_al;
    if(chng){
        let mask=1;
        for(let bitn=0;bitn<32;bitn++){
            if(chng & mask){
                let al_txt='<p style="margin : 0">'+alarms_reason_tb[mask.toString()]+"</p>";
                if(mask & al){//alarm rising
                    if (al_txt.indexOf("ВНИМАНИЕ") >= 0) c2.innerHTML+='<p style="color:darkorange; margin : 0">&#x2757</p>'; //❗ ⚠️  
                    else c2.innerHTML+='<p style="color:red; margin : 0">&#x274C</p>';//❌ 
                    c3.innerHTML+=al_txt;
                }else {
                    c2.innerHTML+='<p style="color:green; margin : 0">&#x2713</p>'; //✔️
                    c3.innerHTML+='<s>'+al_txt+'</s>';
                }
                c4.innerHTML+='<p style="margin : 0">'+bitn+'</p>';
            }
            mask<<=1;
        }
    }else{
        c2.innerHTML="-";
        c3.innerHTML="undefined yet" ;
    }
    let c5=row.insertCell();;        
    c5.innerText=jdata.data.WF_counter[idx]; 
    return al;  
}
//***************************************************************************** */
function AlarmTableDraw(alarms_js){
    let d_len=alarms_js.data.date.length;
    if(!Number.isInteger(d_len))return;
    let prev_al=0;
    let tab = document.getElementById("alarms_tbody_id");
    prev_al=alarms_js.data.alarms[0];
    for(let i=1;i<d_len;i++){
        prev_al=AlTabAddRow(tab,alarms_js,i,0,prev_al);
    }
}
//***************************************************************************** */
async function GetAlarmData(query){
    try {
        const resp = await fetch('/alarms',{
            method: "POST",
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(query),
         });
        let alarms_js = await resp.json();
        return alarms_js;
    }catch(err){
        console.error("Alarm data request error->", err);
    }
}
//***************************************************************************** */
async function AlTabInit(){
    let init_query={
        base:"last",
        direction:"down",
        amount:ALTAB_MAX_LENGTH+1
    };
    let alarms_js = await GetAlarmData(init_query);
    if(alarms_js===undefined)return;
    AlarmTableDraw(alarms_js);
}
//TODO !!! optimize to not redraw entire table
//TODO !!! sometines not realy updatet upper row because DB is not updatet yet
//***************************************************************************** */
function AlTabNewAlarm(){
    al_tab_cont=document.getElementById("alarms_table_id");
    if(al_tab_cont.scrollTop!==0)return;
    let dummy_cnt=0;
    let timer=setInterval(async()=>{//sometines not realy updatet upper row because DB is not updatet yet
        let len=AlTabSlideUp(1);
        dummy_cnt++;
        if(len!=0 || dummy_cnt>100)clearInterval(timer);
    },3000);
}
//************** */
let AlTabScroolTout;
function AlTabScrolled(event){
    if(AlTabScroolTout!==undefined){
        clearTimeout(AlTabScroolTout);
    }
    AlTabScroolTout=setTimeout(async ()=>{
        let tab_cont=document.getElementById("alarms_table_id");
        if(tab_cont.scrollTop==0){
            let len=await AlTabSlideUp(5); 
            if(len==5)tab_cont.scrollTop=10;           
        }
        if((tab_cont.scrollTop +tab_cont.offsetHeight)==tab_cont.scrollHeight){
            AlTabSlideDown(5);
        }
    },1000);    
}
//************** */
//***return number of rows actually added */
async function AlTabSlideUp(ext_rows){
    let query={
        base:"date",
        direction:"up",
        amount: ext_rows+1,
        date:0
    };
    let tab = document.getElementById("alarms_tbody_id");
    let start_time=tab.rows[0].cells[0].innerText;
    query.date=ParseRuDate(start_time);
    let alarms_js = await GetAlarmData(query);  
    if(alarms_js===undefined)return; 
    let len=alarms_js.data.date.length;
    if(len<=1)return 0;//nothing to add 0 - nithing, 1 - only last upper row, that already exist
    prev_al=alarms_js.data.alarms[0];    
    for(let i=1;i<len;i++){
        prev_al=AlTabAddRow(tab,alarms_js,i,0,prev_al);
    }
    let extra=tab.rows.length-ALTAB_MAX_LENGTH;
    if(extra>0){
        for(let i=0;i<extra;i++){
            tab.deleteRow(-1);
        }
    }
    return len-1;
}
//************** */
//***return number of rows actually added */
async function AlTabSlideDown(ext_rows){
    let query={
        base:"date",
        direction:"down",
        amount: ext_rows+1,
        date:0
    };
    let tab = document.getElementById("alarms_tbody_id");
    let max_row_n=tab.rows.length;
    if(max_row_n<=0)return 0;
    let start_time=tab.rows[max_row_n-1].cells[0].innerText;
    query.date=ParseRuDate(start_time)-1;//just 1 sec earlier
    let alarms_js = await GetAlarmData(query);  
    if(alarms_js===undefined)return 0; 
    let len=alarms_js.data.date.length;
    if(len<=1)return 0;//nothing to add 0 - nithing, 1 - only last upper row, that already exist
    prev_al=alarms_js.data.alarms[0];    
    for(let i=1;i<len;i++){
        prev_al=AlTabAddRow(tab,alarms_js,i,max_row_n,prev_al);
    }
    let extra=tab.rows.length-ALTAB_MAX_LENGTH;
    if(extra>0){
        for(let i=0;i<extra;i++){
            tab.deleteRow(0);
        }
    }
    return len-1;
}
//************** */
function ParseRuDate(str){
    let arr=str.split(/[.,:]/);
    let dt=new Date(Date.UTC(arr[2],arr[1]-1,arr[0],arr[3],arr[4],arr[5]));
    return dt.getTime()/1000;
}