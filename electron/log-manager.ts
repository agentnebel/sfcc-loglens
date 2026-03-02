import { WebDAVClient } from './webdav-client'
import { LogParser, ErrorGroup, LogEntry } from './parser'
import dayjs from 'dayjs'

export class LogManager {
    private parser = new LogParser()

    async fetchAndProcessLogs(
        url: string,
        username: string,
        password?: string
    ): Promise<ErrorGroup[]> {
        const client = new WebDAVClient(url, username, password)
        const allFiles = await client.listFiles()

        // Filter for error logs from the last 24h
        const twentyFourHoursAgo = dayjs().subtract(24, 'hour')

        const errorLogFiles = allFiles.filter(file => {
            const fileName = file.name.toLowerCase()

            // [PYTHON-INSPIRED] Be precise: target error-blade and customerror-blade files first
            const isBladeErrorLog = fileName.startsWith('error-blade') || fileName.startsWith('customerror-blade')
            // Fallback: also catch other error logs (e.g. from non-blade setups)
            const isGenericErrorLog = (fileName.includes('error') || fileName.includes('fatal')) &&
                !fileName.includes('api-') &&
                !fileName.includes('syslog-') &&
                !fileName.includes('jobs-')

            const isRelevant = isBladeErrorLog || isGenericErrorLog

            // Filter by date - using a bit more buffer (25h) to ensure we don't miss rolling logs
            const fileDate = dayjs(file.lastModified)
            const isRecent = fileDate.isAfter(twentyFourHoursAgo.subtract(1, 'hour'))

            return isRelevant && isRecent
        })

        const allEntries: LogEntry[] = []

        // Download and parse all relevant files
        for (const file of errorLogFiles) {
            try {
                const content = await client.downloadFile(file.href)
                const entries = this.parser.parse(content)
                allEntries.push(...entries)
            } catch (err) {
                console.error(`Failed to download ${file.name}:`, err)
            }
        }

        // Sort all entries chronologically across all blades
        allEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

        // Cluster the merged logs
        return this.parser.cluster(allEntries)
    }
}
