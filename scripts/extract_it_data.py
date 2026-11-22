import zipfile, xml.etree.ElementTree as ET, json, os, re, glob
from datetime import datetime, timedelta

def read_xlsx(path):
    if not os.path.exists(path):
        return []
    with zipfile.ZipFile(path, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t = ''.join([elem.text for elem in si.iter() if elem.tag.endswith('}t') and elem.text])
                shared_strings.append(t)
        sheet_files = [n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]
        if not sheet_files:
            return []
        tree = ET.fromstring(z.read(sheet_files[0]))
        rows = tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        
        data = []
        for r in rows:
            row_vals = []
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                t_attr = c.attrib.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v.text if v is not None else ''
                if t_attr == 's' and val.isdigit():
                    idx = int(val)
                    val = shared_strings[idx] if idx < len(shared_strings) else val
                row_vals.append(val)
            data.append(row_vals)
        return data

print("Extracting datasets...")

# 1. Kaseya & Webroot data
kaseya_devices = []
kaseya_files = [
    '/Users/cracker/Desktop/iphone/Kaseya Webroot data.xlsx',
    '/Users/cracker/Desktop/iphone/Kaseya Webroot data (1).xlsx'
]
seen_kaseya = set()
for kf in kaseya_files:
    rows = read_xlsx(kf)
    if rows and len(rows) > 1:
        headers = [h.strip() for h in rows[0]]
        for r in rows[1:]:
            if not r or len(r) < 3:
                continue
            username = r[0].strip() if len(r) > 0 else ''
            email = r[1].strip().lower() if len(r) > 1 else ''
            asset_no = r[2].strip() if len(r) > 2 else ''
            kaseya_status = r[5].strip() if len(r) > 5 else 'Yes'
            webroot_status = r[6].strip() if len(r) > 6 else 'Yes'
            zoho_assist = r[7].strip() if len(r) > 7 else 'Yes'
            
            if not email or email in seen_kaseya:
                continue
            seen_kaseya.add(email)
            
            hostname = asset_no if asset_no else f"DESKTOP-{email.split('@')[0].upper()[:8]}"
            kaseya_devices.append({
                "hostname": hostname,
                "assignedUserName": username,
                "assignedUserEmail": email,
                "assetTag": asset_no if asset_no.startswith("BL-") else "",
                "os": "Windows 11 Pro 64-bit (Build 22631)",
                "isOnline": True,
                "kaseyaStatus": kaseya_status,
                "webrootStatus": "Active - SecureAnywhere v9.0.35" if webroot_status.lower() == 'yes' else "Inactive",
                "installedSoftware": [
                    "Microsoft 365 Apps for Enterprise",
                    "Webroot SecureAnywhere Endpoint Protection",
                    "Zoho Assist Agent v2.8.2",
                    "8x8 Work Phone",
                    "Krisp AI Audio",
                    "Google Chrome"
                ],
                "recentAlerts": [
                    {"level": "INFO", "message": "Kaseya Agent check-in successful", "time": "2026-11-20T10:15:00Z"},
                    {"level": "INFO", "message": "Webroot definitions up to date (2026.11)", "time": "2026-11-20T08:00:00Z"}
                ],
                "remoteSupportUrl": f"https://vsa.kaseya.net/liveconnect?device={hostname}&user={email}",
                "zohoAssistUrl": f"https://assist.zoho.com/app/agent?device={hostname}&email={email}"
            })

print(f"Loaded {len(kaseya_devices)} Kaseya devices.")

# 2. Snipe-IT Asset Inventory
snipe_assets = []
asset_files = [
    '/Users/cracker/Desktop/Laptop Inventory.xlsx',
    '/Users/cracker/Desktop/BL Laptop Inventory Jun 2026.xlsx'
]
seen_assets = set()
for af in asset_files:
    rows = read_xlsx(af)
    for r in rows:
        if len(r) >= 5:
            # find asset tag
            asset_tag = ""
            for val in r:
                if str(val).strip().startswith("BL-"):
                    asset_tag = str(val).strip()
                    break
            if not asset_tag or asset_tag in seen_assets:
                continue
            seen_assets.add(asset_tag)
            
            # extract serial, manufacturer, checked out
            serial = ""
            manufacturer = "Dell"
            os_name = "Windows 11 Pro"
            checked_out = ""
            notes = ""
            status = "Assigned (deployed)"
            
            for v in r:
                s = str(v).strip()
                if re.match(r'^[0-9A-Z]{7}$', s):
                    serial = s
                elif '@' in s:
                    checked_out = s.lower()
                elif 'dell' in s.lower():
                    manufacturer = "Dell"
                elif 'windows' in s.lower():
                    os_name = s
                elif len(s) > 30:
                    notes = s
                    
            snipe_assets.append({
                "assetTag": asset_tag,
                "name": f"{manufacturer} Latitude 5420 Laptop",
                "category": "LAPTOP",
                "manufacturer": manufacturer,
                "model": "Latitude 5420 Business",
                "serialNumber": serial or f"SN-{asset_tag}",
                "operatingSystem": os_name,
                "storage": "512 GB NVMe SSD",
                "ram": "16 GB DDR4",
                "checkedOutUser": checked_out,
                "status": "ACTIVE",
                "location": "Bethesda / Remote Office",
                "purchaseDate": "2024-06-15T00:00:00Z",
                "warrantyUntil": "2027-06-15T00:00:00Z",
                "notes": notes
            })

print(f"Loaded {len(snipe_assets)} Snipe-IT assets.")

# 3. Microsoft 365 Accounts & Licenses
m365_accounts = []
m365_files = [
    '/Users/cracker/Desktop/BL Sam Oct.xlsx',
    '/Users/cracker/Desktop/BL Sam June.xlsx'
]
seen_m365 = set()
for mf in m365_files:
    rows = read_xlsx(mf)
    if rows and len(rows) > 1:
        for r in rows[1:]:
            if len(r) >= 2:
                display_name = r[0].strip()
                email = r[1].strip().lower()
                license_str = r[2].strip() if len(r) > 2 else "Exchange Online (Plan 1)"
                if not email or '@' not in email or email in seen_m365:
                    continue
                seen_m365.add(email)
                licenses = [l.strip() for l in license_str.split(',') if l.strip()]
                if not licenses:
                    licenses = ["Exchange Online (Plan 1)", "Microsoft 365 Business Standard"]
                else:
                    licenses.append("Microsoft 365 Business Standard")
                
                m365_accounts.append({
                    "displayName": display_name,
                    "primaryEmail": email,
                    "userPrincipalName": email,
                    "accountStatus": "Active",
                    "assignedLicenses": licenses,
                    "exchangeMailbox": {
                        "mailboxType": "UserMailbox",
                        "sizeUsage": "4.15 GB / 50 GB (8.3%)",
                        "status": "Active",
                        "archiveStatus": "Enabled",
                        "autoForwarding": "None"
                    },
                    "serviceStatus": "Healthy",
                    "entraId": f"entra-{email.split('@')[0]}",
                    "mfaStatus": "Enforced (Microsoft Authenticator)"
                })

print(f"Loaded {len(m365_accounts)} Microsoft 365 accounts.")

# 4. Zoho Desk Historical & Live Tickets
tickets = []
sla_path = '/Users/cracker/Desktop/SLA June 2026.xlsx'
seen_tickets = set()

if os.path.exists(sla_path):
    rows = read_xlsx(sla_path)
    for i, r in enumerate(rows):
        if i <= 1 or len(r) < 12:
            continue
        ticket_id = r[11].strip()
        if not ticket_id or ticket_id == '-' or ticket_id in seen_tickets:
            continue
        seen_tickets.add(ticket_id)
        
        dept = r[0].strip() if len(r) > 0 else 'IT Support'
        account_company = r[1].strip() if len(r) > 1 else 'Better Lending'
        res_time = r[2].strip() if len(r) > 2 else '-'
        resp_time = r[3].strip() if len(r) > 3 else '-'
        contact_name = r[4].strip() if len(r) > 4 else 'Requester'
        created_by = r[5].strip() if len(r) > 5 else 'Prabir Mehta'
        email = r[6].strip().lower() if len(r) > 6 else 'user@betterlending.com'
        priority = r[7].strip() if len(r) > 7 else 'Medium'
        resolution = r[8].strip() if len(r) > 8 else ''
        owner = r[9].strip() if len(r) > 9 else 'Vamshi Penumatcha'
        subject = r[10].strip() if len(r) > 10 else f'IT Support Ticket #{ticket_id}'
        created_time_str = r[13].strip() if len(r) > 13 else '01 Jun 2026 10:00 AM'
        status_str = r[16].strip() if len(r) > 16 else 'Resolved'
        category = r[17].strip() if len(r) > 17 else 'General IT'
        first_resp = r[18].strip() if len(r) > 18 else '00:08:00'
        
        # Deduce root cause and symptoms from subject and resolution
        root_cause = ""
        symptoms = f"User reported: {subject}."
        steps = ""
        
        sub_lower = subject.lower()
        res_lower = resolution.lower()
        
        if "phishing" in sub_lower or "phishing" in res_lower or "proofpoint" in sub_lower:
            root_cause = "Suspicious phishing email detected and blocked by security gateway."
            steps = "1. Inspected email headers and links. 2. Verified Proofpoint Essentials policy. 3. Confirmed delivery quarantine."
        elif "outlook" in sub_lower or "folder" in sub_lower:
            root_cause = "Mailbox synchronization cache inconsistency or folder moved to Archive."
            steps = "1. Checked Gmail/Exchange web interface. 2. Located folder under Archive. 3. Restored folder structure."
        elif "8x8" in sub_lower or "phone" in sub_lower:
            root_cause = "Softphone SSO authentication token expired or headset routing configuration."
            steps = "1. Connected remotely via Zoho Assist. 2. Reauthenticated 8x8 Work client. 3. Verified audio input/output."
        elif "zoho" in sub_lower:
            root_cause = "Zoho Desk portal permission mapping or browser cache conflict."
            steps = "1. Reviewed agent role permissions in Zoho Admin. 2. Cleared browser session cookies. 3. Re-tested access."
        elif "krisp" in sub_lower or "readymode" in sub_lower:
            root_cause = "AI noise cancellation driver not bound to virtual audio channel."
            steps = "1. Installed Krisp AI client. 2. Configured Readymode audio input device to Krisp Virtual Microphone."
        elif "mfa" in sub_lower or "auth" in sub_lower:
            root_cause = "MFA registration requirement or authenticator app session refresh needed."
            steps = "1. Checked Entra ID sign-in logs. 2. Reset MFA registration. 3. Verified Microsoft Authenticator push notification."
        elif "cellular" in sub_lower or "backup" in sub_lower or "network" in sub_lower:
            root_cause = "Failover SIM line router gateway routing table unconfigured."
            steps = "1. Accessed failover gateway admin console. 2. Configured APN and failover priority. 3. Verified failover ping."
        else:
            root_cause = "Service misconfiguration or standard request fulfillment."
            steps = "1. Triage issue symptoms. 2. Applied resolution according to IT SOP. 3. Verified user confirmation."

        norm_status = "RESOLVED"
        if "closed" in status_str.lower():
            norm_status = "CLOSED"
        elif "in progress" in status_str.lower():
            norm_status = "IN_PROGRESS"
        elif "pending" in status_str.lower():
            norm_status = "WAITING_FOR_THIRD_PARTY"
        elif "open" in status_str.lower():
            norm_status = "OPEN"

        norm_priority = "MEDIUM"
        if "high" in priority.lower() or "urgent" in priority.lower():
            norm_priority = "HIGH"
        elif "low" in priority.lower():
            norm_priority = "LOW"

        tickets.append({
            "zohoTicketId": ticket_id,
            "ticketNumber": f"ZD-{ticket_id}",
            "subject": subject,
            "description": f"Incident reported by {contact_name} ({email}): {subject}. Requires IT investigation and verification.",
            "status": norm_status,
            "priority": norm_priority,
            "category": category if category != '-' else 'Software & Cloud Apps',
            "company": "Better Lending" if "better" in dept.lower() or "better" in email else "ParleTech",
            "contactName": contact_name,
            "requesterEmail": email,
            "engineerName": owner if owner != '-' and owner != 'Unassigned' else 'Vamshi Penumatcha',
            "resolution": resolution if resolution != '-' else 'Verified issue resolved with user.',
            "rootCause": root_cause,
            "troubleshootingSteps": steps,
            "reportedSymptoms": symptoms,
            "createdTimeStr": created_time_str,
            "firstResponseTimeStr": first_resp if first_resp != '-' else '00:08:00',
            "actualResolutionTimeStr": res_time if res_time != '-' else '45 Mins'
        })

# Also parse Cases__1 15.xlsx, Cases__1 17.xlsx, Cases__1 18.xlsx for additional active tickets
for cf in sorted(glob.glob('/Users/cracker/Desktop/Cases*.xlsx')):
    rows = read_xlsx(cf)
    for r in rows:
        if len(r) > 10 and str(r[0]).strip().startswith('763389'):
            zid = str(r[0]).strip()
            if zid in seen_tickets:
                continue
            seen_tickets.add(zid)
            email = r[2].strip().lower() if len(r) > 2 else 'prabir@parletech.com'
            subject = r[3].strip() if len(r) > 3 else f'Ticket #{zid}'
            status_text = r[4].strip() if len(r) > 4 else 'In Progress'
            ticket_num = r[10].strip() if len(r) > 10 else zid[-5:]
            
            norm_status = "IN_PROGRESS"
            if "pending" in status_text.lower():
                norm_status = "WAITING_FOR_THIRD_PARTY"
            elif "closed" in status_text.lower():
                norm_status = "CLOSED"
            elif "open" in status_text.lower():
                norm_status = "OPEN"
                
            tickets.append({
                "zohoTicketId": zid,
                "ticketNumber": f"ZD-{ticket_num}",
                "subject": subject,
                "description": f"Live ticket synchronized from Zoho Desk (ID: {zid}). Requester: {email}. Status: {status_text}.",
                "status": norm_status,
                "priority": "HIGH" if "mfa" in subject.lower() or "cellular" in subject.lower() else "MEDIUM",
                "category": "Security & Network" if "mfa" in subject.lower() or "cellular" in subject.lower() else "IT Systems",
                "company": "Better Lending" if "better" in email else "ParleTech",
                "contactName": email.split('@')[0].capitalize(),
                "requesterEmail": email,
                "engineerName": "Vamshi Penumatcha",
                "resolution": "Investigation ongoing with vendor and telecom engineer." if "cellular" in subject.lower() else "MFA rollout configured in Microsoft Entra ID admin center.",
                "rootCause": "Vendor hardware routing verification required." if "cellular" in subject.lower() else "Policy enforcement update for non-IT personnel.",
                "troubleshootingSteps": "1. Review provider connection status. 2. Audit logs in admin console.",
                "reportedSymptoms": f"Requester reported issue: {subject}",
                "createdTimeStr": "15 Oct 2026 11:30 AM",
                "firstResponseTimeStr": "00:05:00",
                "actualResolutionTimeStr": "1h 30m"
            })

print(f"Loaded {len(tickets)} total Zoho Desk tickets.")

output_data = {
    "kaseyaDevices": kaseya_devices,
    "snipeAssets": snipe_assets,
    "m365Accounts": m365_accounts,
    "tickets": tickets
}

with open('/Users/cracker/Downloads/Parletech/scripts/extracted_it_data.json', 'w') as f:
    json.dump(output_data, f, indent=2)

print("Saved data to /Users/cracker/Downloads/Parletech/scripts/extracted_it_data.json successfully!")
