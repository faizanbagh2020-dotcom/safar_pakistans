#!/usr/bin/env python3
"""Regenerate the compact JSON data files from data/source/*.csv."""
import json, re
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "source"
OUT = ROOT / "data"
def clean(v):
    if pd.isna(v): return ""
    s = str(v).strip()
    return "" if s.lower() in {"nan","none","null","n/a","na"} else s
def coords(lat, lon):
    try:
        a, b = float(lat), float(lon)
        if -90 <= a <= 90 and -180 <= b <= 180 and not (a == 0 and b == 0): return a, b
    except Exception: pass
    return None, None
def url_or_empty(value):
    value = clean(value)
    if not value: return ""
    if not value.lower().startswith(("http://","https://")): value = "https://" + value
    return value
combined = pd.read_csv(SRC/"combined_data.csv", encoding="latin1", low_memory=False)
lahore = pd.read_csv(SRC/"hotels-in-lahore-pakistan.csv", encoding="latin1", low_memory=False)
destinations = pd.read_csv(SRC/"Tourist Destinations.csv", encoding="utf-8-sig", low_memory=False)
pattern = re.compile(r"\b(hotel|guest\s*house|guesthouse|resort|motel|hostel|lodge|inn|bed\s*and\s*breakfast|bnb|rest\s*house|tourist\s*house|rooms?\s*&?\s*suites?)\b", re.I)
hotels=[]
for _,r in combined.iterrows():
    name=clean(r.get("name"))
    if not name or not pattern.search(name): continue
    lat,lon=coords(r.get("latitude"),r.get("longitude"))
    hotels.append({"id":f"combined-{len(hotels)+1}","name":name,"category":"Accommodation","address":clean(r.get("address")),"city":clean(r.get("city")),"stateOrProvince":clean(r.get("state")),"phone":clean(r.get("phone_number")),"email":"","website":url_or_empty(r.get("website")),"latitude":lat,"longitude":lon,"mapUrl":clean(r.get("url")) or (f"https://www.google.com/maps?q={lat},{lon}" if lat is not None else ""),"sourceDataset":"combined_data.csv"})
for _,r in lahore.iterrows():
    name=clean(r.get("Name ")) or clean(r.get("Name"))
    if not name: continue
    address, address2=clean(r.get("Address")),clean(r.get("Address.1"))
    if address2 and address2.lower() not in address.lower(): address=(address+", "+address2).strip(", ")
    lat,lon=coords(r.get("Lat"),r.get("Log"))
    phone=clean(r.get("Mobile No"))
    if phone:
        digits=re.sub(r"\D","",phone)
        if digits.startswith("92"): phone="+"+digits
        elif digits.startswith("0"): phone="+92"+digits[1:]
        elif len(digits)==10: phone="+92"+digits
    hotels.append({"id":f"lahore-{len(hotels)+1}","name":name,"category":clean(r.get("ï»¿Catag")) or clean(r.get("Catag")) or "Hotel","address":address,"city":"Lahore","stateOrProvince":clean(r.get("Pro")) or "Punjab","phone":phone,"email":"","website":"","latitude":lat,"longitude":lon,"mapUrl":f"https://www.google.com/maps?q={lat},{lon}" if lat is not None else "","sourceDataset":"hotels-in-lahore-pakistan.csv"})
seen=set(); deduped=[]
for h in hotels:
    key=(re.sub(r"\W+","",h["name"].lower()),re.sub(r"\W+","",h["city"].lower()),re.sub(r"\W+","",h["address"].lower())[:80])
    if key not in seen: seen.add(key); deduped.append(h)
dest_out=[]
for i,r in destinations.iterrows():
    name=clean(r.get("_key"))
    if not name: continue
    lat,lon=coords(r.get("latitude"),r.get("longitude"))
    dest_out.append({"id":f"destination-{i+1}","name":name,"description":clean(r.get("Desc")),"category":clean(r.get("category")) or "Destination","district":clean(r.get("district")),"latitude":lat,"longitude":lon,"mapUrl":f"https://www.google.com/maps?q={lat},{lon}" if lat is not None else ""})
(OUT/"hotels.json").write_text(json.dumps(deduped,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
(OUT/"destinations.json").write_text(json.dumps(dest_out,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print(f"Created {len(deduped)} accommodation records and {len(dest_out)} destinations.")
