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
function AlarmTableDraw(jalarms_data){
    let d_len=jalarms_data.data.date.length;
    if(!Number.isInteger(d_len))return;
    let prev_al=0;
    let tab_ref = document.getElementById("alarms_tbody_id");
    for(let i=0;i<d_len;i++){
        let row=tab_ref.insertRow(0);

        let c1=row.insertCell();
        let tm=new Date(jalarms_data.data.date[i]*1000);
        c1.innerText=tm.toLocaleString("ru-RU",{timeZone: "UTC"});
        
        let c2=row.insertCell();
        c2.innerHTML="";
        let c3=row.insertCell();
        c3.innerHTML="";
        let c4=row.insertCell();
        c4.innerHTML="";
        let al=jalarms_data.data.alarms[i];
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
        prev_al=al;       
        
        let c5=row.insertCell();;        
        c5.innerText=jalarms_data.data.WF_counter[i];
    }
}
//***************************************************************************** */
async function GetAlarmData(){
    let init_query={
        base:"last",
        direction:"down",
        amount:200
    };
    try {
        const resp = await fetch('/alarms',{
            method: "POST",
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(init_query),
         });
        let alarms_js = await resp.json();
        AlarmTableDraw(alarms_js);
    }catch(err){
        console.error("Trend data request error->", err);
    }
}
//TODO !!! optimize to not redraw entire table
function AlTabNewAlarm(){
    al_tab_cont=document.getElementById("alarms_table_id");
    if(al_tab_cont.scrollTop!==0)return;
    let al_tab = document.getElementById("alarms_tbody_id");
    while(al_tab.rows.length){
        al_tab.deleteRow(0);
    }
    GetAlarmData();
}