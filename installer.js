// installer.js
var electronInstaller = require('electron-winstaller')

var resultPromise = electronInstaller.createWindowsInstaller({
  appDirectory: './dist/solapi-desktop-app-demo-win32-x64',
  outputDirectory: './dist/installer/solapi-desktop-app-demo',
  authors: 'EdenCha',
  exe: 'solapi-desktop-app-demo.exe',
  description: 'solapi-desktop-app-demo'
})

resultPromise.then(
  () => console.log('It worked!'),
  e => console.log(`No dice: ${e.message}`)
)
