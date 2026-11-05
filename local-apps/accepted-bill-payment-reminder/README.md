# Accepted Bill Payment Reminder

A local Windows/Outlook companion app listed on the website under **AutoMailer**. It reads LC register spreadsheets and an applicant email list, prepares accepted-bill payment reminders, and opens or sends them through desktop Outlook after explicit user confirmation.

## Requirements

- Windows with desktop Outlook installed and signed in
- Permission to run the supplied PowerShell script in the user's Windows session
- LC register files (`.xls` or `.xlsx`) and an applicant email list (`.xls`, `.xlsx`, or `.csv`)

The public website cannot send through desktop Outlook by itself. The local companion server must be running on the same PC as Outlook.

## First setup

1. Extract the complete `Accepted-Bill-Payment-Reminder` folder to a permanent location on the Windows PC. Do not separate the BAT file from `server.ps1`, `index.html`, or `lib/`.
2. Open desktop Outlook and sign in.
3. Double-click `Start_BTB_Emailer.bat`.
4. Keep the console window open while using the tool. The operational page opens at `http://localhost:8765/`.

The offline SheetJS and JSZip libraries are already included. `Get_Offline_Libraries.bat` is only needed if those library files must be downloaded again.

## Daily use

1. Open desktop Outlook.
2. Double-click `Start_BTB_Emailer.bat` on the PC. Visiting the public website is not required for daily use.
3. Select all applicable LC registers and the applicant email list.
4. Choose a maturity date or inclusive date range and, if required, enable Nostro emails.
5. Select **Find bills and prepare emails**.
6. Review statistics, matched bills, missing addresses, and email previews.
7. Select emails and explicitly confirm **Send**, or use **Open** to review an individual message in Outlook before sending it manually.

Sent messages appear in Outlook Sent Items. Open/send attempts are logged in `logs/email_log_YYYY-MM.csv` beside the app.

## Data handling

Spreadsheet parsing and email preparation happen locally in the browser. The local PowerShell server communicates only with desktop Outlook and writes the local CSV log. No register, applicant list, or email content is sent to the public website by this app.

Do not distribute real registers, applicant email lists, or generated logs with the app package.

## Troubleshooting

- **App server not running:** close the directly opened page and start the app through `Start_BTB_Emailer.bat`.
- **Outlook not available:** open Outlook once, confirm that it is signed in, and click the status pill to retry.
- **Session expired:** the local server was restarted; reload the operational page.
- **No bills found:** check the maturity date and that the LC numbers contain supported codes in the expected position.
- **Sending stopped:** keep the console window open and click the Outlook status pill to reconnect.

`Start_Web_App.bat` opens only the browser interface. Outlook Open/Send is unavailable in that mode; use `Start_BTB_Emailer.bat` for the operational app.
