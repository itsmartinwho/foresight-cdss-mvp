# Foresight CDSS Documentation

This directory contains comprehensive documentation for the Foresight Clinical Decision Support System.

## Transcription System Documentation

### 🚨 For Developers Working on Transcription
- **[Transcription Development Guide](./transcription-development-guide.md)** - **START HERE** - Essential patterns and warnings for developers making changes to the transcription system
- **[Transcription System Documentation](./transcription-system-documentation.md)** - Complete technical documentation of the transcription architecture
- **[Transcription Fix Notes](./transcription-fix-notes.md)** - Historical context about the critical race condition fix

### Key Points for Any Developer:
1. **Never include `stopTranscription` in useEffect dependency arrays** - this breaks the system
2. **Always use the ref-state pattern** for transcription state that needs cleanup access
3. **Test pause/resume functionality** after any changes to transcription-related code
4. **Follow the exact cleanup order** when modifying resource management

## Other Documentation

*Additional documentation files will be listed here as they are created.*

## Getting Help

If you're working on transcription features and run into issues:
1. Check the development guide first
2. Review recent git commits for transcription-related changes
3. Test your changes against the testing checklist
4. Ask for help if you see transcription starting and stopping in loops

## Contributing to Documentation

When making significant changes to any system:
1. Update the relevant documentation files
2. Add new documentation for new features
3. Update this index if adding new documentation sections
4. Follow the established documentation patterns and structure 