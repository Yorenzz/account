import { app, BrowserWindow, screen } from 'electron'
// import LoginWindowIpcStart from './ipcLogin'
// import MainWindowIpcStart from './ipcMain'
// import DeviceWindowIpcStart from './ipcDevice'
const path = require('path')
const isPackaged = app.isPackaged
const radio = 0.75

const SIZE = {
	WIDTH: 1080,
	HEIGHT: 607.5
}
app.on('ready', function () {
	const primaryDisplay = screen.getPrimaryDisplay()
	const size = primaryDisplay.size
	console.log(size, '1')
	SIZE.WIDTH = size.width * radio < 1080 ? 1000 : size.width * radio
	SIZE.HEIGHT = size.height * radio < 607.5 ? 600 : size.height * radio
	// SIZE.WIDTH = size.width
	// SIZE.HEIGHT = size.height
})
class ManageWindows {
	constructor() {
		this.win = '' // 主窗口
		this.loginWin = '' // 登录窗口
		this.deviceWins = [] // 所有打开的设备窗口实例
		this.isAllCloseDeviceWins = false // 是否是主窗口关闭然后触发设备窗口全部关闭，如果是则deviceWins不需要splice，否则需要
	}
	// 创建登录窗口
	createLoginWin() {
		this.loginWin = new BrowserWindow({
			width: 420,
			height: 518,
			resizable: false, // 窗口大小是否可以调整
			useContentSize: true,
			// transparent: true,
			// frame: false, // 创建无边框窗口
			show: false,
			// shadow: true,
			webPreferences: {
				webSecurity: true,
				nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION, // 在渲染进程中启用Node.js
				contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
			},
		})
		if (isPackaged) {
			this.loginWin.loadFile('./index.html', {
				hash: '/'
			})
		} else {
			// 开发环境
			this.loginWin.loadURL('http://localhost:5173')
		}
		this.loginWin.on('closed', () => {
			this.loginWin = null
			app.quit()
		})
		// 登录窗口创建完成展示
		this.loginWin.once('ready-to-show', () => {
			this.loginWin.show()
			// 调试面板
			!isPackaged && this.loginWin.webContents.openDevTools()
		})
		return this.loginWin
	}
	// 创建主窗口
	createMainWin() {
		if (this.win) return
		this.win = new BrowserWindow({
			width: SIZE.WIDTH,
			height: SIZE.HEIGHT,
			minWidth: 1000,
			minHeight: 600,
			resizable: true,
			maximizable: false, // 禁止双击菜单栏最大化
			frame: false,
			show: false,
			webPreferences: {
				webSecurity: false,
				allowRunningInsecureContent: false,
				nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
				contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
				preload: path.join(__dirname, 'mainPreload.js')
			},
			icon: `${__static}/favicon.ico` // 窗口图标
		})
		if (isPackaged) {
			this.win.loadFile('./index.html', {
				hash: '/device'
			})
			// this.win.webContents.openDevTools()
		} else {
			this.win.loadURL('http://localhost:5173/#/device')
		}
		// 从主窗口右上角或底部菜单栏关闭主窗口会触发此事件，此时销毁隐藏的登录窗口
		this.win.on('close', () => {
			app.quit()
		})
		// 从主窗口右上角或底部菜单栏关闭主窗口或退出登录都会触发此事件
		this.win.on('closed', () => {
			this.isAllCloseDeviceWins = true
			// 关闭所有的设备窗口 此过程deviceWins的closed事件里不需要splice
			this.deviceWins.forEach(e => e.deviceWinInstance.destroy())
			this.deviceWins = [] // 重置状态
			this.isAllCloseDeviceWins = false // 重置状态
			this.win = null
			// 销毁托盘
			appManager.tray.destroy()
		})
		this.win.once('ready-to-show', () => {
			// 显示主窗口
			this.win.show()
			// 创建成功重置登录页loading
			this.loginWin.webContents.send('loginMessage')
			// 隐藏登录窗口
			this.loginWin.hide()
			// 调试面板
			!isPackaged && this.win.webContents.openDevTools()
		})
		// 创建最小化托盘
		appManager.mainTray()
		this.win.on('unmaximize', () => {
			this.win.webContents.send('unmaximize')
		})
	}
	// 创建设备窗口
	createDeviceWin(data) {
		const alreadyInstance = this.deviceWins.find(
				e => e.serviceId === data.serviceId
		)
		// 如果当前设备已打开推流 则将窗口聚焦显示在最前面并移动到屏幕中间
		if (alreadyInstance) {
			alreadyInstance.deviceWinInstance.focus()
			alreadyInstance.deviceWinInstance.center()
			return
		}
		let deviceWin = new BrowserWindow({
			width: 387, // 337 + 50
			height: 640, // 600 + 40
			minWidth: 387, // 竖屏的最小值
			minHeight: 640,
			maxWidth: 724, // 竖屏的最大值
			maxHeight: 1240,
			resizable: true, // 窗口大小是否可以调整
			frame: false,
			maximizable: false, // 禁止双击菜单栏最大化
			webPreferences: {
				nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
				contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
				webSecurity: false,
				preload: path.join(__dirname, 'devicePreload.js')
			},
			icon: `${__static}/favicon.ico` // 窗口图标
		})
		// 在底部栏关闭此窗口时会触发close和closed
		deviceWin.on('close', () => {
			console.log('触发close')
			// 通知渲染进程解绑设备
			deviceWin.webContents.send('closeDevice')
		})
		// 在设备页用destroy()关闭此窗口时会触发closed
		deviceWin.on('closed', () => {
			// 如果是手动单个关闭设备窗口，则需要进行splice
			if (!this.isAllCloseDeviceWins) {
				const idx = this.deviceWins.findIndex(
						e => e.serviceId === data.serviceId
				)
				// 将此设备移除
				this.deviceWins.splice(idx, 1)
				deviceWin = null
			}
		})
		if (isPackaged) {
			// 生产环境
			createProtocol('app')
			deviceWin.loadFile('./index.html', {
				hash: `/deviceWin?dId=${data.deviceId}&sId=${data.serviceId}&nodeType=${data.nodeType}&payMode=${data.payMode}&uuid=${data.uuid}&aliasName=${data.aliasName}&apiHost=${data.apiHost}&ttl=${data.ttl}`
			})
		} else {
			// 开发环境
			const url =
					data.url +
					`?dId=${data.deviceId}&sId=${data.serviceId}&nodeType=${data.nodeType}&payMode=${data.payMode}&uuid=${data.uuid}&aliasName=${data.aliasName}&apiHost=${data.apiHost}&ttl=${data.ttl}`
			deviceWin.loadURL(url)
		}
		// 存储设备窗口 关闭主窗口时关闭所有的设备窗口
		this.deviceWins.push({
			serviceId: data.serviceId,
			payMode: data.payMode,
			deviceWinInstance: deviceWin
		})
		deviceWin.on('will-resize', this.willResizeWindow)
		// 登录窗口创建完成展示
		deviceWin.on('ready-to-show', () => {
			deviceWin.show()
			// 调试面板
			!isPackaged && deviceWin.webContents.openDevTools()
		})
	}
	// 监听设备窗口大小改变
	willResizeWindow(event, newBounds) {
		const sender = event.sender
		// 阻止默认行为
		event.preventDefault()
		const currentSize = sender.getSize()
		const widthChanged = currentSize[0] != newBounds.width
		if (currentSize[0] < currentSize[1]) {
			// 宽小于高，证明此时是竖屏
			// 0.5px,1px偏差，解决在window10存在的问题
			if (widthChanged) {
				sender.setContentSize(
						newBounds.width - 1,
						Math.ceil((60 * (newBounds.width - 50)) / 33.7 + 40 + 0.5) - 1
				)
			} else {
				sender.setContentSize(
						Math.ceil((33.7 * (newBounds.height - 40)) / 60 + 50 + 0.5) - 1,
						newBounds.height - 1
				)
			}
		} else if (currentSize[0] > currentSize[1]) {
			// 宽大于高，证明此时是横屏
			if (widthChanged) {
				sender.setContentSize(
						newBounds.width - 1,
						Math.ceil((38.8 * (newBounds.width - 50)) / 69 + 40 + 0.5) - 1
				)
			} else {
				sender.setContentSize(
						Math.ceil((69 * (newBounds.height - 40)) / 38.8 + 50 + 0.5) - 1,
						newBounds.height - 1
				)
			}
		}
	}
}

export default new ManageWindows()
