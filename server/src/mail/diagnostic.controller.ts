import { Controller, Get, Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as net from 'net';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

@Controller('diagnostic')
export class DiagnosticController {
    private readonly logger = new Logger(DiagnosticController.name);

    @Get('network')
    async checkNetwork() {
        const results = {
            dns: null,
            tcp: null,
            env: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_SECURE,
            },
        };

        const host = process.env.SMTP_HOST || 'smtp-pulse.com';
        const port = Number(process.env.SMTP_PORT) || 587;

        // 1. DNS Check
        try {
            this.logger.log(`Resolving DNS for ${host}...`);
            const addresses = await resolve4(host);
            results.dns = { success: true, addresses };
            this.logger.log(`DNS Resolved: ${JSON.stringify(addresses)}`);
        } catch (error) {
            results.dns = { success: false, error: error.message };
            this.logger.error(`DNS Resolution failed: ${error.message}`);
        }

        // 2. TCP Connection Check (Multiple Ports)
        const portsToCheck = [25, 465, 587, 2525];
        results.tcp = {};

        for (const p of portsToCheck) {
            try {
                this.logger.log(`Testing TCP connection to ${host}:${p}...`);
                await new Promise<void>((resolve, reject) => {
                    const socket = new net.Socket();
                    socket.setTimeout(3000); // 3s timeout per port

                    socket.connect(p, host, () => {
                        socket.end();
                        resolve();
                    });

                    socket.on('error', (err) => {
                        reject(err);
                    });

                    socket.on('timeout', () => {
                        socket.destroy();
                        reject(new Error('Connection timed out'));
                    });
                });
                results.tcp[p] = { success: true, message: 'Connected' };
                this.logger.log(`TCP Connection to ${p} successful`);
            } catch (error) {
                results.tcp[p] = { success: false, error: error.message };
                this.logger.error(`TCP Connection to ${p} failed: ${error.message}`);
            }
        }

        return results;
    }
}
