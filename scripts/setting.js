const { ipcRenderer } = require('electron')

    const SelectServers=document.getElementById('SelectServers');
    const RefreshServersButton=document.getElementById('RefreshServersButton');
    const SaveSettingButton=document.getElementById('SaveSettingButton');
    const LunchButton=document.getElementById('LunchButton');
    const BackButton=document.getElementById('BackButton');
    const M1Fullscreen=document.getElementsByClassName('FullScreen1')[0];
    const StatusLabel=document.getElementById('StatusLabel');
    const reportPrinter=document.getElementById('reportPrinter');
    const labelPrinter=document.getElementById('labelPrinter');
    const SAVE_URL_LABEL='Saved Url';




    checkServers(SelectServers);
    let setting=ipcRenderer.sendSync('getSetting',1);
    FillPrinters()
    FillInputSetting(setting);



DetectStatusTwiceMonitor()






RefreshServersButton.addEventListener('click',function (){
    ipcRenderer.sendSync('refreshServers',1);
    checkServers(SelectServers);
});
BackButton.addEventListener('click',function (){
    ipcRenderer.send('back',1);
});

SaveSettingButton.addEventListener('click',function (){
    let domain=SelectServers.value!=SAVE_URL_LABEL?SelectServers.value:setting.domain;
    if(domain.length>1 && domain[domain.length-1]=='/')
        domain=domain.substring(0,domain.length-1)
    let is_full_screen_1=M1Fullscreen.checked;
    let url1=domain;
    let url2=domain+'/web/customer_display#action=customer_display.ui';
    let report_printer=reportPrinter.value
    let label_printer=labelPrinter.value
    ipcRenderer.send('saveSetting',{domain,is_full_screen_1,url1,url2,report_printer,label_printer})
});

LunchButton.addEventListener('click',function (){
    ipcRenderer.send('lunch',1)
});



function checkServers(ServersElement){
        let servers=ipcRenderer.sendSync('getServers',1);
        console.log(servers);
        let servers_option='';
        for(server in servers){
            let server_url=servers[server];
            servers_option+=`<option value="${server_url}">${server}</option>`
        }
        ServersElement.innerHTML=servers_option;
    }
function FillInputSetting(setting){


        if(setting.url1)
            SelectServers.innerHTML+=`<option value="${setting.url1}" selected>${SAVE_URL_LABEL}</option>`

        if(setting.is_full_screen_1)
            M1Fullscreen.checked=true;

    reportPrinter.value=setting.report_printer
    labelPrinter.value=setting.label_printer

    }
function FillPrinters() {
    let printers=ipcRenderer.sendSync('get-printers',1);
    let printers_option='';
    for(printer in printers){
        let name_printer=printers[printer];
        printers_option+=`<option value="${name_printer}">${name_printer}</option>`
    }
    reportPrinter.innerHTML=printers_option;
    labelPrinter.innerHTML=printers_option;
}
function DetectStatusTwiceMonitor() {
    let has_twice=ipcRenderer.send('checkTwiceMonitor',1);
    if(has_twice){
        StatusLabel.innerText='You Are Use 1 Monitor !!'
        StatusLabel.classList.remove('text-success')
        StatusLabel.classList.add('text-danger')
    }else{
        StatusLabel.innerText='You Are Use 2 Monitor !!'
        StatusLabel.classList.remove('text-danger')
        StatusLabel.classList.add('text-success')
    }
}