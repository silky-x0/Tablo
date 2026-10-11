const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');

// Ensure JAVA_HOME points to JDK 21
const defaultJdk = 'C:\\Users\\brahm\\.jdks\\jdk-21.0.6+7';
const javaHome = process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)
  ? process.env.JAVA_HOME
  : (fs.existsSync(defaultJdk) ? defaultJdk : process.env.JAVA_HOME);

if (javaHome) {
  process.env.JAVA_HOME = javaHome;
  process.env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH}`;
}

// Ensure ANDROID_HOME points to Android Sdk
const defaultSdk = 'C:\\Users\\brahm\\AppData\\Local\\Android\\Sdk';
const androidHome = process.env.ANDROID_HOME || (fs.existsSync(defaultSdk) ? defaultSdk : null);
if (androidHome) {
  process.env.ANDROID_HOME = androidHome;
}

const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? (process.env.COMSPEC || 'cmd.exe') : './gradlew';
const gradlewArgs = isWindows ? ['/c', 'gradlew.bat', 'assembleDebug'] : ['assembleDebug'];

console.log('Building Android APK via Gradle...');
console.log('JAVA_HOME:', process.env.JAVA_HOME);
console.log('ANDROID_HOME:', process.env.ANDROID_HOME);

const result = spawnSync(gradlewCmd, gradlewArgs, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

if (result.status !== 0) {
  console.error('\n[ERROR] Gradle build failed with exit code:', result.status);
  process.exit(result.status || 1);
}

// Locate output APK
const outputApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const rootApk = path.join(rootDir, 'Tablo-debug.apk');

if (fs.existsSync(outputApk)) {
  fs.copyFileSync(outputApk, rootApk);
  const stats = fs.statSync(rootApk);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log('\n========================================');
  console.log(' SUCCESS: APK Built Successfully!');
  console.log(' Output APK:', rootApk);
  console.log(` Size: ${sizeMb} MB`);
  console.log('========================================\n');
} else {
  console.error('APK built but output file not found at:', outputApk);
  process.exit(1);
}
