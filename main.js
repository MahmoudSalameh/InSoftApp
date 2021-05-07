const {app, BrowserView,dialog,Menu, ipcMain, BrowserWindow, screen} = require('electron')
const os = require('os');
const storage = require('electron-json-storage');
const fs = require('fs');
const axios = require('axios')
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
const NAVBAR_HEIGHT = 50;
const SETTING_FILE_NAME = 'electron_insoft'
let TEMP_FOLDER = os.homedir()
let FULL_PATH_SETTING_APP = `${TEMP_FOLDER}\\${SETTING_FILE_NAME}`
const DATABASE_API_URL = 'https://support.insoftonline.de/api/v1/servers/domain'


let mainWindow;

let browserViewPrimary;
let customerScreenWindow;

let primaryScreen

let printWindow;
let secondaryScreen;
let numberMonitor
let hasTwiceMonitor
let setting;
let printers;

app.on('ready', function () {

    storage.setDataPath(FULL_PATH_SETTING_APP)

    PrepareBrowser();
console.log(app.getVersion())
})


//################# Main Function #################
function PrepareBrowser() {

    printWindow = new BrowserWindow(
        {
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show:false,
            icon: 'assets/icons/win/icon.ico' // sets window icon

        }
    );
    printWindow.loadFile("worker.html");
    // printWindow.hide();
    printWindow.on("closed", () => {
        printWindow = undefined;
    });

    PrepareSetting(FULL_PATH_SETTING_APP, storage);


    primaryScreen = screen.getPrimaryDisplay()


     secondaryScreen = screen.getAllDisplays().find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    })

     numberMonitor=screen.getAllDisplays().length

     hasTwiceMonitor=numberMonitor==2;


    mainWindow = new BrowserWindow({
        width: primaryScreen.width,
        height: primaryScreen.height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        kiosk: false,
        fullscreen: true,
        icon: 'assets/icons/win/icon.ico' // sets window icon
    });






    browserViewPrimary = new BrowserView({
        webPreferences: {
            nodeIntegration: true,
        },
    })

    mainWindow.loadFile('index.html');

    const template = [
        {
            label: 'Setting',
            click(){
                mainWindow.loadFile('setting.html')
                mainWindow.setBrowserView(null)
            }
        },
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    setting = getSetting(storage)

    if (setting.url1) {
        InitView(browserViewPrimary, mainWindow, setting.url1);

        if (!setting.is_full_screen_1)
            mainWindow.setFullScreen(false);
    } else
        mainWindow.loadFile('setting.html')

    if(hasTwiceMonitor && setting && setting.url2){

        runSecondMonitor(secondaryScreen,hasTwiceMonitor);
    }

    //Event Listener
    mainWindow.on('enter-full-screen', () => Responsive(browserViewPrimary, mainWindow, true));
    mainWindow.on('leave-full-screen', () => Responsive(browserViewPrimary, mainWindow, false));
    screen.on('display-added',function (){
        secondaryScreen = screen.getAllDisplays().find((display) => {
            return display.bounds.x !== 0 || display.bounds.y !== 0
        })
        if(secondaryScreen){
            hasTwiceMonitor=true;
            runSecondMonitor(secondaryScreen,hasTwiceMonitor);
        }

    });



    browserViewPrimary.webContents.on('console-message', (event, level, message, line, sourceId) => {
        let msg = message.toString();
        let printer='';
        if (msg.indexOf('electron') != -1) {

            if (msg.indexOf('Print') != -1) {
                if(msg.indexOf('labelPrinter')!=-1){
                    printer=setting.label_printer
                }else if(msg.indexOf('reportPrinter')!=-1){
                    printer=setting.report_printer
                }
                else{
                    printer=getDefaultPrinterName()
                }
                browserViewPrimary.webContents.executeJavaScript(`document.getElementsByClassName('pos-sale-ticket')[0].outerHTML`).then(html => {
                    if (html) {
                        printWindow.webContents.send("printPDF", {html,printer});
                    }
                })
            }

        }

    });

    autoUpdater.on('checking-for-update', () => {
        log.info('Hello, checking-for-update');
        console.log('Hello, checking-for-update');
    })
    autoUpdater.on('update-not-available', () => {
        log.info('Hello, not-available');
        console.log('Hello, not-available');
    })
    autoUpdater.on('error', () => {
        log.info('Hello, not-available');
        console.log('Hello, not-available');
    })
    autoUpdater.on('update-available', () => {
        const dialogOpts = {
            type: 'info',
            buttons: ['Update', 'Later'],
            title: 'Application Update',
            message: process.platform === 'win32' ? '' : '',
            detail: 'A new version has been downloaded. Click Update Button To Start Updating'
        }

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
            if (returnValue.response === 0) autoUpdater.quitAndInstall()
        })
    });
    autoUpdater.on('update-downloaded', () => {

    });
}
function runSecondMonitor(secondaryScreen,hasTwiceMonitor){
    if (!customerScreenWindow && hasTwiceMonitor){
        customerScreenWindow = new BrowserWindow({
            width: secondaryScreen.width,
            height: secondaryScreen.height,
            x:secondaryScreen.bounds.x,
            y:secondaryScreen.bounds.y,
            webPreferences: {
                nodeIntegration: true,
            },
            kiosk: true,
            fullscreen: true,
            icon: 'assets/icons/win/icon.ico' // sets window icon
        });
        customerScreenWindow.loadURL(setting.url2)
    } else if(customerScreenWindow){
        customerScreenWindow.show(true)
        customerScreenWindow.webContents.reload()
    }


    // customerScreenWindow.loadURL(setting.url2)
}

//######################### IPC Event Listener ######################
ipcMain.on('reload-page', (event, arg) => {
    let numberScreen = arg
    reload(browserViewPrimary)
    if(customerScreenWindow)
        reload(customerScreenWindow)
    else
        runSecondMonitor(customerScreenWindow,hasTwiceMonitor)

})
ipcMain.on('shutdown', (event, arg) => {
    app.exit();
})
ipcMain.on('fullscreen', (event, arg) => {
    mainWindow.isFullScreen() ? mainWindow.setFullScreen(false) : mainWindow.setFullScreen(true)
    Responsive(browserViewPrimary, mainWindow, mainWindow.isFullScreen())
})
ipcMain.on('save', (event, arg) => {
    FillSetting({url1: browserViewPrimary.webContents.getURL()})
})
ipcMain.on('getServers', (event, arg) => {

    event.returnValue = getServers(storage);

})
ipcMain.on('refreshServers', (event, arg) => {
    refreshServers(storage);
})
ipcMain.on('getSetting', (event, arg) => {
    event.returnValue = getSetting(storage);
})
ipcMain.on('saveSetting', (event, arg) => {
    FillSetting(arg);
})
ipcMain.on('lunch', (event, arg) => {
    mainWindow.loadFile('index.html');
    InitView(browserViewPrimary, mainWindow, setting.url1);
})

ipcMain.on("readyToPrintPDF", (event,arg) => {
    // Use default printing options
    printWindow.webContents.print({silent: true,deviceName:arg})
})
ipcMain.on("detectScreen", (event) => {
    // Use default printing options
    detectScreen()
    if(!customerScreenWindow)
        runSecondMonitor(customerScreenWindow,hasTwiceMonitor)
})
ipcMain.on("check-update", (event) => {
    // autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.checkForUpdatesAndNotify().then(r => {
        console.log(r.versionInfo)
    });


})
ipcMain.on("checkTwiceMonitor", (event) => {
    event.returnValue=hasTwiceMonitor
})
ipcMain.on("back", (event) => {
    console.log('back')
    if(browserViewPrimary){
        console.log('yes')
        mainWindow.loadFile('index.html')
        mainWindow.setBrowserView(browserViewPrimary)
    }
})
ipcMain.on("get-printers", (event) => {
    printers=printWindow.webContents.getPrinters()
    event.returnValue=printers.reduce((data,current)=>{
        data.push(current.name)
        return data;
    },[])
})


//################ Helper Method For Browser #########################
function InitView(view, mainWindow, url) {

    let bounds = mainWindow.getBounds();
    let winWidth = bounds.width;
    let winHeight = bounds.height;
    mainWindow.setBrowserView(view)
    view.setBounds({x: 0, y: NAVBAR_HEIGHT, width: winWidth, height: winHeight - 500})
    mainWindow.openDevTools()
    view.setAutoResize({
        width: true,
        height: true,
        horizontal: true,
        vertical: true
    })
    view.webContents.loadURL(url);
}

function VisibleView(view_toShow, view_toHide, mainWindow) {
    view_toShow.show();
    view_toHide.hide();
    InitView(view_toShow, mainWindow);
}

function Responsive(view, mainWindow, is_full) {
    let bounds = mainWindow.getBounds();
    let winWidth = bounds.width;
    let winHeight = bounds.height;
    let w = is_full ? 0 : 10
    let h = is_full ? 75 : 100
    // console.log(winWidth - (SpaceWidth))
    view.setBounds({x: 0, y: NAVBAR_HEIGHT, width: winWidth - w, height: winHeight - h})
}

function reload(window) {
    window.webContents.reload();
}

function detectScreen(){

    // console.log({customerScreenWindow , hasTwiceMonitor , secondaryScreen});

    if(mainWindow && primaryScreen){
        mainWindow.setBounds(primaryScreen.bounds)
        mainWindow.setFullScreen(true)
        Responsive(browserViewPrimary, mainWindow, true)
    }
    if (customerScreenWindow && hasTwiceMonitor && secondaryScreen){
        customerScreenWindow.setBounds(secondaryScreen.bounds)
    customerScreenWindow.setFullScreen(true)
    }
}

//################# Async Functions ##########################
async function getServersFromApi() {
    return axios.get(DATABASE_API_URL);
}

async function refreshServers(storage) {
    await getServersFromApi(DATABASE_API_URL).then(res => {
        let servers = res.data.servers;
        storage.set('servers', servers, function (error) {
            if (error) throw error;

            return servers;
        });
    });
}


//################# Other Function #########################
function CheckServers(storage) {
    return storage.has('servers', function (error, hasKey) {
        if (error) throw error;

        if (!hasKey) {
            return refreshServers(storage)
        }
    });
}

function checkSetting(storage) {
    storage.has('setting', function (error, hasKey) {
        if (error) reject(error);
        if (!hasKey) {
            FillSetting({
                url1: '',
                domain: '',
                is_full_screen_1: true,
                is_full_screen_2: true,
                is_first_monitor_primary: true,
                anydesk: '',
                sleepmode: '',
                report_printer:getDefaultPrinterName(),
                label_printer:getDefaultPrinterName(),
            })
        } else
            storage.get('setting', function (error, data) {
                if (error) throw error;

                setting = data;
            });
        return true;
    });

}

function FillSetting(options) {
    data = Object.assign(setting, options);
    storage.set('setting', data, function (error) {
        if (error) throw error;
        setting = data;
    });
}

function getServers(storage) {
    return storage.getSync('servers', function (error, data) {
        if (error) return error

        return data
    });
}

function getSetting(storage) {
    return storage.getSync('setting', function (error, data) {
        if (error) throw error;
        return data;
    });
}

function PrepareSetting(tempFolder, storage) {

    if (!fs.existsSync(tempFolder))
        fs.mkdirSync(tempFolder);

    CheckServers(storage);
    checkSetting(storage)

    return true;
}
function getDefaultPrinterName(){
    if(printWindow)
       return printWindow.webContents.getPrinters().find(printer=>printer.isDefault).name
}


