import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('printers')
  async getPrinters(): Promise<{ printers: string[] }> {
    const printers = await this.appService.getPrinters();
    return { printers };
  }

  @Post('printers/test-ip')
  async testPrinterIp(@Body() body: { ip: string; port?: number }): Promise<{ success: boolean; message: string }> {
    return this.appService.checkPrinterIp(body.ip, body.port);
  }

  @Post('scan/launch-hardware')
  async launchHardwareScanner(): Promise<{ success: boolean; message: string }> {
    return this.appService.launchHardwareScanner();
  }

  @Post('scan/launch-kyocera-panel')
  async launchKyoceraPanel(@Body() body: { ip: string }): Promise<{ success: boolean; message: string }> {
    return this.appService.launchKyoceraPanel(body.ip);
  }

  @Post('scan/setup-smb-share')
  async setupSmbShare(@Body() body: { folder: string }): Promise<{ success: boolean; sharePath: string; message: string }> {
    return this.appService.setupScanToSmbShare(body.folder);
  }

  @Post('scan/watch-folder')
  async watchFolder(@Body() body: { folder: string; fileName: string; format: string }): Promise<{ success: boolean; filePath: string; message: string }> {
    return this.appService.watchFolderForNewScan(body.folder, body.fileName, body.format);
  }

  @Post('scan')
  async executeScan(@Body() body: {
    folder: string;
    fileName: string;
    printerIp?: string;
    dpi?: number;
    format?: string;
    actionTitle?: string;
    clientNom?: string;
  }): Promise<{ success: boolean; filePath: string; message: string }> {
    return this.appService.executeScan(body);
  }

  @Post('open-folder')
  async openFolder(@Body() body: { filePath: string }): Promise<{ success: boolean }> {
    return this.appService.openFolder(body.filePath);
  }
}
