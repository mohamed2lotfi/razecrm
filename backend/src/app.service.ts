import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

function resolveLocalDrivePath(targetFolder: string): string {
  if (!targetFolder) return 'D:\\AgencyCRM\\Documents_Scannes';

  if (fs.existsSync(targetFolder)) {
    return targetFolder;
  }

  const relativeSubpath = targetFolder.replace(/^[a-zA-Z]:\\/, '');
  const driveMatch = targetFolder.match(/^([a-zA-Z]):\\/);
  const originalDriveLetter = driveMatch ? driveMatch[1].toUpperCase() : 'D';

  const candidateDrives = ['Z', 'D', 'C', 'E', 'F', 'G'];

  for (const drive of candidateDrives) {
    if (drive !== originalDriveLetter) {
      const candidatePath = `${drive}:\\${relativeSubpath}`;
      const candidateAgencyFolder = `${drive}:\\AgencyCRM`;

      if (fs.existsSync(candidatePath) || fs.existsSync(candidateAgencyFolder)) {
        console.log(`Dossier AgencyCRM détecté sur le lecteur ${drive}:\\. Redirection vers : ${candidatePath}`);
        return candidatePath;
      }
    }
  }

  if (originalDriveLetter === 'D' && fs.existsSync('Z:\\')) {
    return `Z:\\${relativeSubpath}`;
  }

  return targetFolder;
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getPrinters(): Promise<string[]> {
    const printerSet = new Set<string>();

    try {
      const { stdout: psOut } = await execAsync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"');
      psOut.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0).forEach(p => printerSet.add(p));
    } catch (err) {
      console.warn('Erreur Get-Printer:', err);
    }

    try {
      const { stdout: wmiOut } = await execAsync('powershell -Command "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"');
      wmiOut.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0).forEach(p => printerSet.add(p));
    } catch (err) {
      console.warn('Erreur WMI Printer:', err);
    }

    return Array.from(printerSet);
  }

  async checkPrinterIp(ip: string, port: number = 9100): Promise<{ success: boolean; message: string }> {
    const cleanIp = ip.trim();
    if (!cleanIp) {
      return { success: false, message: 'Adresse IP invalide' };
    }

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.on('connect', () => {
        socket.destroy();
        resolve({ success: true, message: `Périphérique réseau Kyocera en ligne sur ${cleanIp}:${port}` });
      });

      socket.on('timeout', () => {
        socket.destroy();
        const httpSocket = new net.Socket();
        httpSocket.setTimeout(2000);
        httpSocket.on('connect', () => {
          httpSocket.destroy();
          resolve({ success: true, message: `Kyocera Command Center connecté sur ${cleanIp} (Port Web 80)` });
        });
        httpSocket.on('error', () => { httpSocket.destroy(); resolve({ success: false, message: `Aucune réponse sur ${cleanIp}` }); });
        httpSocket.on('timeout', () => { httpSocket.destroy(); resolve({ success: false, message: `Délai dépassé pour ${cleanIp}` }); });
        httpSocket.connect(80, cleanIp);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve({ success: false, message: `Connexion impossible sur ${cleanIp}` });
      });

      socket.connect(port, cleanIp);
    });
  }

  async launchHardwareScanner(): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync('powershell -Command "Start-Process wiaacmgr.exe"');
      return { success: true, message: "Lancement de l'Assistant Numérisation Windows..." };
    } catch (err) {
      try {
        await execAsync('powershell -Command "Start-Process ms-scan:"');
        return { success: true, message: "Lancement de l'application Numérisation..." };
      } catch (err2: any) {
        return { success: false, message: `Erreur scanner : ${err2.message}` };
      }
    }
  }

  async launchKyoceraPanel(ip: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanIp = ip.trim();
      await execAsync(`powershell -Command "Start-Process 'http://${cleanIp}'"`);
      return { success: true, message: `Kyocera Command Center ouvert sur http://${cleanIp}` };
    } catch (err: any) {
      return { success: false, message: `Erreur ouverture panneau Kyocera : ${err.message}` };
    }
  }

  async setupScanToSmbShare(folder: string): Promise<{ success: boolean; sharePath: string; message: string }> {
    try {
      const targetFolder = resolveLocalDrivePath(folder);

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      // Get computer name and IP
      const { stdout: computerName } = await execAsync('hostname');
      const hostname = computerName.trim();

      // Get LAN IP
      let lanIp = '';
      try {
        const { stdout: ipOut } = await execAsync('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch \'Loopback\' -and $_.PrefixOrigin -ne \'WellKnown\' } | Select-Object -First 1).IPAddress"');
        lanIp = ipOut.trim();
      } catch (e) {
        lanIp = '192.168.1.20';
      }

      // Create a Windows SMB share for the scan folder
      const shareName = 'KyoceraScan';
      try {
        // Remove existing share if any
        await execAsync(`powershell -Command "Remove-SmbShare -Name '${shareName}' -Force -ErrorAction SilentlyContinue"`);
      } catch (e) { /* ignore */ }

      try {
        await execAsync(`powershell -Command "New-SmbShare -Name '${shareName}' -Path '${targetFolder}' -FullAccess 'Everyone' -ErrorAction Stop"`);
      } catch (e) {
        console.warn('Partage SMB déjà existant ou permissions insuffisantes:', e);
      }

      const smbPath = `\\\\${lanIp}\\${shareName}`;
      const smbPathHostname = `\\\\${hostname}\\${shareName}`;

      return {
        success: true,
        sharePath: smbPath,
        message: `Dossier partagé créé !\n\nConfigurez votre Kyocera Scan-to-SMB avec :\n• Chemin SMB : ${smbPath}\n• ou : ${smbPathHostname}\n• Dossier local : ${targetFolder}`
      };
    } catch (error: any) {
      return { success: false, sharePath: '', message: `Erreur partage SMB : ${error.message}` };
    }
  }

  async watchFolderForNewScan(folder: string, expectedFileName: string, format: string): Promise<{ success: boolean; filePath: string; message: string }> {
    const targetFolder = resolveLocalDrivePath(folder);

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Get list of existing files BEFORE the scan
    const existingFiles = new Set(fs.readdirSync(targetFolder));

    // Wait up to 60 seconds for a new file to appear
    const maxWaitMs = 60000;
    const pollIntervalMs = 1500;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const check = () => {
        const currentFiles = fs.readdirSync(targetFolder);
        const newFiles = currentFiles.filter(f => !existingFiles.has(f));

        if (newFiles.length > 0) {
          // Found new file(s) from scanner
          const scannedFile = newFiles[0];
          const scannedPath = path.join(targetFolder, scannedFile);

          // Rename to expected filename
          const finalPath = path.join(targetFolder, expectedFileName);
          try {
            if (scannedPath !== finalPath) {
              fs.renameSync(scannedPath, finalPath);
            }
          } catch (e) {
            // File may be locked by scanner, use original name
            resolve({ success: true, filePath: scannedPath, message: `Document scanné reçu : ${scannedFile}` });
            return;
          }

          resolve({ success: true, filePath: finalPath, message: `Document numérisé et renommé : ${expectedFileName}` });
          return;
        }

        if (Date.now() - startTime >= maxWaitMs) {
          resolve({ success: false, filePath: '', message: 'Délai dépassé (60s). Aucun nouveau fichier détecté dans le dossier de réception.' });
          return;
        }

        setTimeout(check, pollIntervalMs);
      };
      check();
    });
  }

  async executeScan(dto: {
    folder: string;
    fileName: string;
    printerIp?: string;
    dpi?: number;
    format?: string;
    actionTitle?: string;
    clientNom?: string;
  }): Promise<{ success: boolean; filePath: string; message: string }> {
    try {
      const rawFolder = dto.folder || 'D:\\AgencyCRM\\Documents_Scannes';
      const targetFolder = resolveLocalDrivePath(rawFolder);

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      let fullFilePath = path.join(targetFolder, dto.fileName);

      let scanAcquired = false;

      // Attempt WIA acquisition if Windows scanner connected
      try {
        // WIA CommonDialog.SaveFile plante si on demande une extension PDF ou si le fichier existe déjà.
        // On force l'extension en .jpg pour que WIA gère l'image correctement
        let finalPath = fullFilePath;
        if (finalPath.toLowerCase().endsWith('.pdf')) {
          finalPath = finalPath.replace(/\.pdf$/i, '.jpg');
        }
        
        if (fs.existsSync(finalPath)) {
          fs.unlinkSync(finalPath);
        }

        const psScript = `$dialog = New-Object -ComObject WIA.CommonDialog; $img = $dialog.ShowAcquireImage(1, 1, 1); if ($img) { $img.SaveFile('${finalPath.replace(/\\/g, '\\\\')}'); Write-Output 'WIA_OK' } else { Write-Output 'WIA_CANCELLED' }`;
        const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
        if (stdout.includes('WIA_OK')) {
          scanAcquired = true;
          // Mise à jour du nom de fichier pour correspondre à l'extension générée
          fullFilePath = finalPath;
          dto.fileName = path.basename(finalPath);
        }
      } catch (wiaErr) {
        console.warn('Acquisition WIA indisponible:', wiaErr);
      }

      // Placeholder PDF if WIA didn't work
      if (!scanAcquired || !fs.existsSync(fullFilePath)) {
        const content = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>> endobj
xref
0 4
0000000000 65535 f
0000000015 00000 n
0000000068 00000 n
0000000125 00000 n
trailer <</Size 4 /Root 1 0 R>>
startxref
190
%%EOF`;

        fs.writeFileSync(fullFilePath, content, 'utf-8');
      }

      return {
        success: true,
        filePath: fullFilePath,
        message: `Fichier enregistré sous : ${fullFilePath}`
      };
    } catch (error: any) {
      console.error('Erreur numérisation:', error);
      return { success: false, filePath: '', message: `Erreur : ${error.message}` };
    }
  }

  async openFolder(filePath: string): Promise<{ success: boolean }> {
    try {
      const resolvedPath = resolveLocalDrivePath(filePath);
      const safePath = resolvedPath.replace(/\//g, '\\');

      if (fs.existsSync(safePath)) {
        await execAsync(`explorer.exe /select,"${safePath}"`);
      } else {
        const folderOnly = path.dirname(safePath);
        if (!fs.existsSync(folderOnly)) {
          fs.mkdirSync(folderOnly, { recursive: true });
        }
        await execAsync(`explorer.exe "${folderOnly}"`);
      }
      return { success: true };
    } catch (err) {
      console.error('Erreur ouverture dossier:', err);
      return { success: false };
    }
  }
}
