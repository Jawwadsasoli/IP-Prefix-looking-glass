# IP-Prefix-looking-glass

A utility tool designed to automate the verification of IP prefixes against route filters in a network environment. The tool supports batch processing using router backups or real-time verification via CLI connections to routers.

# Prefix Checker Tool

This project is a web-based tool to check IP prefixes for ownership, visibility on ASN, and route filter presence using RIPEstat, APNIC, and router backup files.

## Features
- Check prefix ownership via APNIC WHOIS.
- Verify visibility over the internet using RIPEstat API.
- Search prefixes in router backup files for route filters.
- Generate CCF (Customer Configuration File) for prefixes.

## Usage
1. Upload router backup files (`.txt` format).
2. Enter prefixes (comma- or whitespace-separated) and the ASN.
3. Click "Submit" to see results.
4. Optionally, generate a `.ccf` file.

## Requirements
- Modern browser (supports HTML5 and JavaScript).
- Router backup files in `.txt` format.

## File Structure

project/ ├── index.html # Main HTML file ├── style.css # CSS for styling ├── script.js # JavaScript code ├── README.md # Project documentation

## License
This project is open source and available under the MIT License.
