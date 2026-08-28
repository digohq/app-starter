import { Injectable } from '@nestjs/common';
import { promises as dns } from 'dns';

@Injectable()
export class DnsService {
  async lookupTxtRecords(domain: string): Promise<string[]> {
    try {
      const records = await dns.resolveTxt(domain);
      // resolveTxt returns an array of arrays (each TXT record can have multiple strings)
      return records.map((record) => record.join(''));
    } catch (error) {
      // If no records found or domain doesn't exist, return empty array
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        return [];
      }
      throw error;
    }
  }

  async verifyTxtRecord(domain: string, expectedToken: string): Promise<boolean> {
    const verificationDomain = `_app-starter-verify.${domain}`;
    const records = await this.lookupTxtRecords(verificationDomain);
    return records.includes(expectedToken);
  }
}
