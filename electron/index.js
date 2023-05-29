import { app, BrowserWindow } from 'electron'
import path from 'path'
//app 控制应用程序的事件生命周期。
//BrowserWindow 创建并控制浏览器窗口。
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';
import manageWindow from './lib/manageWindow'
let win;
//定义全局变量获取 窗口实例

const createWindow = () => {
	manageWindow.createLoginWin()
	// win = new BrowserWindow({
	// 	//
	// 	webPreferences: {
	// 		webSecurity: true,
	// 		nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION, // 在渲染进程中启用Node.js
	// 		contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
	// 		//允许html页面上的javascipt代码访问nodejs 环境api代码的能力（与node集成的意思）
	// 	}
	// })
	// if(process.env.NODE_ENV != 'development') {
	// 	win.loadFile(path.join(__dirname, '..', 'dist/index.html'))
	// } else {
	// 	win.loadURL(process.env['VITE_DEV_SERVER_URL'])
	// }
	// win.openDevTools()
}
//在Electron完成初始化时被触发
app.whenReady().then(() => {
	// installExtension(VUEJS_DEVTOOLS)
	// .then((name) => console.log(`Added Extension:  ${name}`))
	// .catch((err) => console.log('An error occurred: ', err))
	createWindow()
})
