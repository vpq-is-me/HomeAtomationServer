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
    for(let i=0;i<d_len;i++){
        let al=jalarms_data.data.alarms[i];
        let mask=al^prev_al;
        let bitn;
        for(bitn=0;bitn<32;bitn++){
            if(mask & 1)break;
            mask=mask>>1;
        }
        mask=1<<bitn;//this prevent if mask inadvertantly has more than one bit set
        prev_al=al;
        let rise=mask^al;

        let row=document.createElement("tr");

        let c1=document.createElement("td");
        let tm=new Date(jalarms_data.data.date[i]*1000);
        c1.innerText=tm.toLocaleString("ru-RU",{timeZone: "UTC"});

        let c2=document.createElement("td");
        let al_txt=alarms_reason_tb[mask.toString()]; 
        if(rise){
            if (al_txt.indexOf("ВНИМАНИЕ") >= 0) c2.innerHTML='<p style="color:darkorange; margin : 0">&#x2757</p>'; //❗ ⚠️  
            else c2.innerHTML='<p style="color:red; margin : 0">&#x274C</p>';//❌   
        }
        else c2.innerHTML='<p style="color:green; margin : 0">&#x2713</p>'; //✔️
        
        let c3=document.createElement("td");               
        if(rise)c3.innerHTML=al_txt;
//        if(rise)c3.innerHTML='<p style="color:red">'+al_txt+'</p>';
        else c3.innerHTML='<s>'+al_txt+'</s>';
        let c4=document.createElement("td");        
        c4.innerText=bitn;
        let c5=document.createElement("td");        
        c5.innerText=jalarms_data.data.WF_counter[i];
        row.append(c1);
        row.append(c2);
        row.append(c3);
        row.append(c4);
        row.append(c5);
        document.getElementById("alarms_tbody_id").appendChild(row);
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
//        return trend_js;
        AlarmTableDraw(alarms_js);
    }catch(err){
        console.error("Trend data request error->", err);
    }
}