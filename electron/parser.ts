import crypto from 'crypto'

export interface LogEntry {
    timestamp: string
    severity: string
    message: string
    stacktrace: string
    siteId?: string
    requestId?: string
    sessionId?: string
    raw: string
}

export interface ErrorGroup {
    signature: string
    title: string
    message: string
    count: number
    firstSeen: string
    lastSeen: string
    siteIds: string[]
    lastRequestId?: string
    lastSessionId?: string
    // Store up to 3 request IDs (like the Python script)
    requestIds: string[]
    entries: LogEntry[]
}

export class LogParser {
    // Regex to match the start of a log entry: [2024-03-21 10:20:01.123 GMT]
    private entryStartRegex = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d{3})?\s\w+)\]/

    parse(content: string): LogEntry[] {
        const lines = content.split(/\r?\n/)
        const entries: LogEntry[] = []
        let currentEntry: Partial<LogEntry> | null = null

        for (const line of lines) {
            const match = line.match(this.entryStartRegex)

            if (match) {
                // Save previous entry
                if (currentEntry) {
                    entries.push(this.finalizeEntry(currentEntry as LogEntry))
                }

                // Start new entry
                const timestamp = match[1]
                const remaining = line.substring(match[0].length).trim()

                // Match severity and initial message
                const severityMatch = remaining.match(/^([A-Z_-]+)\s+(.*)$/)

                currentEntry = {
                    timestamp,
                    severity: severityMatch ? severityMatch[1] : 'INFO',
                    message: severityMatch ? severityMatch[2] : remaining,
                    stacktrace: '',
                    raw: line
                }
            } else if (currentEntry) {
                // Append to stacktrace of current entry
                currentEntry.stacktrace += (currentEntry.stacktrace ? '\n' : '') + line
                currentEntry.raw += '\n' + line
            }
        }

        if (currentEntry) {
            entries.push(this.finalizeEntry(currentEntry as LogEntry))
        }

        return entries
    }

    private finalizeEntry(entry: LogEntry): LogEntry {
        // [PYTHON-INSPIRED] Skip very short/empty messages (< 5 chars) as they can't form useful clusters
        if (entry.message.trim().length < 5) return entry

        // Extract Request ID: PipelineCall|ID, JobCall|ID, etc. (more patterns than Python)
        const specReqMatch = entry.message.match(/(?:\[)?(?:PipelineCall|JobCall|Job|PipelineCallServlet)[^|]*\|([^\]\s|]+)(?:\])?/i)

        if (specReqMatch) {
            entry.requestId = specReqMatch[1]
        } else {
            const reqMatch = entry.message.match(/\[(?:Req-)?([a-f0-9]{20,})\]/) ||
                entry.message.match(/\[Req-([^\]]+)\]/)
            if (reqMatch) entry.requestId = reqMatch[1]
        }

        // Extract Session ID
        const sessMatch = entry.message.match(/\[(?:Sess|Session)-([^\]]+)\]/) ||
            entry.message.match(/\[([a-zA-Z0-9_-]{8,15})\]/)
        if (sessMatch && !entry.requestId?.includes(sessMatch[1])) {
            entry.sessionId = sessMatch[1]
        }

        // Extract Site ID
        const siteMatch = entry.message.match(/site:(\w+)/i) || entry.message.match(/Sites-([\w-]+)/i)
        if (siteMatch) entry.siteId = siteMatch[1]

        return entry
    }

    cluster(entries: LogEntry[]): ErrorGroup[] {
        const groups: Record<string, ErrorGroup> = {}

        for (const entry of entries) {
            const sev = entry.severity.toUpperCase()
            const isError = sev.includes('ERROR') || sev.includes('FATAL') || sev.includes('EXCEPTION')
            const isWarning = sev.includes('WARN')

            if (!isError && !isWarning) continue

            // [PYTHON-INSPIRED] Skip very short messages before clustering
            const cleanMsg = entry.message.split('\n')[0]
            if (cleanMsg.trim().length < 5) continue

            const signature = this.getFingerprint(entry)

            if (!groups[signature]) {
                groups[signature] = {
                    signature,
                    title: this.extractTitle(cleanMsg),
                    message: cleanMsg,
                    count: 0,
                    firstSeen: entry.timestamp,
                    lastSeen: entry.timestamp,
                    siteIds: [],
                    requestIds: [],
                    entries: []
                }
            }

            const group = groups[signature]
            group.count++
            group.entries.push(entry)

            // Latest metadata
            if (entry.timestamp >= group.lastSeen) {
                group.lastRequestId = entry.requestId || group.lastRequestId
                group.lastSessionId = entry.sessionId || group.lastSessionId
            }

            // [PYTHON-INSPIRED] Collect up to 3 unique request IDs per error group
            if (entry.requestId && group.requestIds.length < 3 && !group.requestIds.includes(entry.requestId)) {
                group.requestIds.push(entry.requestId)
            }

            if (entry.siteId && !group.siteIds.includes(entry.siteId)) {
                group.siteIds.push(entry.siteId)
            }

            if (entry.timestamp < group.firstSeen) group.firstSeen = entry.timestamp
            if (entry.timestamp > group.lastSeen) group.lastSeen = entry.timestamp
        }

        return Object.values(groups).sort((a, b) => b.count - a.count)
    }

    private extractTitle(message: string): string {
        // 1. Check for JS Error types: TypeError, ReferenceError, etc.
        const jsErrorMatch = message.match(/([A-Z][a-zA-Z]+Error):/)
        if (jsErrorMatch) return jsErrorMatch[1]

        // 2. Check for Java Exceptions: com.package.ExceptionName or just ExceptionName
        // Look for things ending in Exception or Error followed by : or -
        const javaExceptionMatch = message.match(/([A-Z][a-zA-Z0-9]+(?:Exception|Error))[:\s-]/)
        if (javaExceptionMatch) return javaExceptionMatch[1]

        // 3. Handle Blade logs: "thread info package.ClassName - message"
        // Look for the part before the " - " but after any thread info
        const bladeMatch = message.match(/(?:^|\s)([a-zA-Z0-9._]+\.[A-Z][a-zA-Z0-9]+)\s+-/)
        if (bladeMatch) {
            const parts = bladeMatch[1].split('.')
            return parts[parts.length - 1] // Return ClassName
        }

        // 4. If it contains a ":", take the part before it if it looks like a type
        const colonParts = message.split(':')
        if (colonParts.length > 1 && colonParts[0].length < 60 && !colonParts[0].includes(' ')) {
            return colonParts[0].trim()
        }

        // 5. Fallback: first 50 chars of the cleaned message
        return message.length > 50 ? message.substring(0, 50).trim() + '...' : message.trim()
    }

    private getFingerprint(entry: LogEntry): string {
        const firstLineStack = entry.stacktrace ? entry.stacktrace.split('\n')[0] : ''
        let body = entry.message + (firstLineStack.includes('at') ? firstLineStack : '')

        // Normalize: remove noise
        body = body
            .replace(/\[Req-[^\]]+\]/g, '[Req]')
            .replace(/\[(Sess|Session)-[^\]]+\]/g, '[Sess]')
            .replace(/site:\w+/g, 'site')
            // [PYTHON-INSPIRED] Remove UUIDs
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')
            // [PYTHON-INSPIRED] Remove hex values (e.g. 0x4F3A...)
            .replace(/0x[0-9a-f]+/gi, '[HEX]')
            // [PYTHON-INSPIRED] Only replace long numbers (5+ digits = order IDs, customer IDs)
            //   instead of replacing ALL numbers (which was too aggressive)
            .replace(/\b\d{5,}\b/g, '[NUM]')

        return crypto.createHash('md5').update(body).digest('hex')
    }
}
