const table_rows={
    WF_counter:	{val:-1,descr:"Счетчик воды,л",color: "#f00",checked:"disabled",yscale: "yinf"},
    PP_capacity:{val:-1,descr:"Производительность насоса, л/с",color: "#c06",checked:"checked",yscale: "y1"},
    PP_capacity_avg:{val:-1,descr:"Производительность \nнасоса средняя,л/с",color: "#30f",checked:"checked",yscale: "y1"},
    TK_volume:{val:-1,descr:"Расчетный объем ГА,л",color: "#acf",checked:"unchecked",yscale: "y10"},
    alarms:	{val:-1,descr:"Алармы",color: "#fff",checked:"disabled"},
    last_time:	{val:-1,descr:"Время последней посылки",color: "#cf0",checked:"disabled"},
    PP_ON_ACC:	{val:-1,descr:"Полное время \nработы насоса,c",color: "#0f3",checked:"checked",yscale: "y20"},
    PP_RUN_MAX:	{val:-1,descr:"Длиннейшее включение\nнасоса,с",color: "#c60",checked:"unchecked",yscale: "y20"},
    PP_RUN_MIN:	{val:-1,descr:"Кратчайшее включение\nнасоса,с",color: "#3ff",checked:"checked",yscale: "y20"},
    PP_RUN_AT_PULSE:{val:-1,descr:"Время работы насоса\nв момент импульса,с",color: "#fff",checked:"disabled",yscale: "y20"},
    date:{val:-1,descr:"hidden anyway",color: "#fff",checked:"checked",yscale: "y20",hidden:true,},
}

function PumpTableDraw(jpump_data){
    if(jpump_data === undefined){//id="flexCheckDefault">
        for(key in table_rows){
            if(table_rows[key].hidden===true)continue;
            let row=document.createElement("tr");
            let c1=document.createElement("td");
            c1.innerText=table_rows[key].descr;
            let c2=document.createElement("td");
            c2.id="cell_"+key.toString();
            c2.innerText="---";
            let c3=document.createElement("td");
            if (table_rows[key].checked != "disabled") {
                c3.innerHTML = '<div class="form-check">\
                         <input class="form-check-input" type="checkbox" id=chk_'+ key.toString()+' onchange="enable_trend(this)" value="" '+ table_rows[key].checked + '> \
                         <span class="dot" style="background-color:'+ table_rows[key].color + '"></span> \
                         </div>';
            }
            row.appendChild(c1);
            row.appendChild(c2);
            row.appendChild(c3);
            document.getElementById('inst_tbody_id').appendChild(row);
        }
    } else {   
        for (let key in jpump_data) {
            let dist_cell_id = "cell_" + key.toString();
            dist_cell=document.getElementById(dist_cell_id);
            if(dist_cell)dist_cell.textContent = jpump_data[key];
        }
    }    
 }
async function enable_trend(chk_box){
    let key=chk_box.id.substring(4);
    if(chk_box.checked){
        table_rows[key].checked="checked";
        await ActivateNewTrend(key);
    }else{
        table_rows[key].checked="unchecked";
        let tmp=basic_trends.data.datasets;
        for(let i=0; i<tmp.length;i++){
            if(tmp[i].label===key){
                tmp.splice(i,1);
                break;
            }
        }
        basic_trends.options.animation.duration=0;
        basic_trends.update();
    }
}


