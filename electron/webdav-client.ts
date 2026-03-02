import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

export interface WebDAVFile {
    name: string
    href: string
    lastModified: string
    size: number
    isDir: boolean
}

export class WebDAVClient {
    private parser = new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: true,
    })

    constructor(
        private url: string,
        private username: string,
        private password?: string
    ) { }

    private get authHeader() {
        if (!this.password) return {}
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64')
        return { Authorization: `Basic ${auth}` }
    }

    async listFiles(): Promise<WebDAVFile[]> {
        const response = await axios({
            method: 'PROPFIND',
            url: this.url,
            headers: {
                ...this.authHeader,
                Depth: '1',
                'Content-Type': 'text/xml',
            },
        })

        const result = this.parser.parse(response.data)
        const multistatus = result.multistatus
        if (!multistatus || !multistatus.response) return []

        const responses = Array.isArray(multistatus.response) ? multistatus.response : [multistatus.response]

        // First element is usually the directory itself
        return responses.slice(1).map((res: any) => {
            const prop = res.propstat.prop
            return {
                name: res.href.split('/').filter(Boolean).pop() || '',
                href: res.href,
                lastModified: prop.getlastmodified,
                size: parseInt(prop.getcontentlength || '0'),
                isDir: !!prop.resourcetype?.collection,
            }
        })
    }

    async downloadFile(href: string): Promise<string> {
        const baseUrl = new URL(this.url).origin
        const response = await axios({
            method: 'GET',
            url: `${baseUrl}${href}`,
            headers: this.authHeader,
            responseType: 'text',
        })
        return response.data
    }
}
