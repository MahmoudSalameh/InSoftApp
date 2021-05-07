const { ipcRenderer } = require('electron')


const ReloadButton=document.getElementById('ReloadButton');
const FullscreenButton=document.getElementById('FullScreenButton');
const DetectButton=document.getElementById('DetectButton');
const ShutdownButton=document.getElementById('ShutdownButton');
const SaveButton=document.getElementById('SaveButton');
const StatusIcon=document.getElementById('StatusIcon');
const CheckUpdateButton=document.getElementById('CheckUpdateButton');


ChangeStatusColor(StatusIcon,window.navigator.onLine)


// document.getElementsByTagName('h1')[0]

ReloadButton.addEventListener('click',function (){
    ipcRenderer.send('reload-page',1)
});
DetectButton.addEventListener('click',function (){
    ipcRenderer.send('detectScreen',1)
});

ShutdownButton.addEventListener('click',function (){
    ipcRenderer.send('shutdown',1)
});

FullscreenButton.addEventListener('click',function (){
    ipcRenderer.send('fullscreen',1)

    StatusIcon.classList.add('text-success')
});

SaveButton.addEventListener('click',function (){
    ipcRenderer.send('save',1)
});
CheckUpdateButton.addEventListener('click',function (){
    ipcRenderer.send('check-update',1)
});

function updateOnlineStatus(){
    ChangeStatusColor(StatusIcon,window.navigator.onLine)
}

function ChangeStatusColor(element,online){
    if(online){
        element.style.color='#4bff00'
    }else{
        element.style.color='#f51717d9'
    }
}
window.addEventListener('online', updateOnlineStatus)
window.addEventListener('offline', updateOnlineStatus)


