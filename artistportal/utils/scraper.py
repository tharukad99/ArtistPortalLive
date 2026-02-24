import requests
import re
from bs4 import BeautifulSoup

class SocialScraper:
    def __init__(self):
        # User-Agent from the user's working script
        self.headers = {
            "User-Agent": "Mozilla/5.0"
        }

    def _as_int(self, s):
        if not s: return None
        # User's logic: strip non-numeric
        try:
            # First try careful conversion for K/M
            text = str(s).upper().replace(",", "").strip()
            multiplier = 1
            if 'K' in text:
                multiplier = 1000
                text = text.replace('K', '')
            elif 'M' in text:
                multiplier = 1000000
                text = text.replace('M', '')
            
            nums = re.findall(r"[\d.]+", text)
            if nums:
                return int(float(nums[0]) * multiplier)
        except: pass
        
        # Fallback to user's provided regex
        try:
            clean = re.sub(r"[^0-9]", "", str(s))
            return int(clean) if clean else None
        except: return None

    def get_instagram_followers(self, username):
        username = username or "tharukad92"
        url = f"https://www.instagram.com/{username}/"
        try:
            r = requests.get(url, headers=self.headers, timeout=10)
            if r.status_code != 200: return None
            
            soup = BeautifulSoup(r.text, "html.parser")
            
            # 1. Meta Description
            for meta in soup.find_all("meta"):
                c = meta.get("content", "")
                if "Followers" in c:
                    m = re.search(r"([\d,.\w]+)\s*Followers", c, re.IGNORECASE)
                    if m: return self._as_int(m.group(1))

            # 2. Title
            if soup.title and "Followers" in soup.title.string:
                m = re.search(r"([\d,.\w]+)\s*Followers", soup.title.string, re.IGNORECASE)
                if m: return self._as_int(m.group(1))

        except Exception as e:
            print(f"IG Error: {e}")
        return None

    def get_facebook_followers(self, identifier):
        identifier = identifier or "61577393050995"
        # User's URLs
        urls = [
            f"https://m.facebook.com/{identifier}",
            f"https://www.facebook.com/{identifier}"
        ]
        
        for url in urls:
            try:
                r = requests.get(url, headers=self.headers, timeout=10)
                if r.status_code != 200: continue
                
                soup = BeautifulSoup(r.text, "html.parser")
                
                # 1. Meta Tags (from user logic)
                for meta in soup.select("meta[content]"):
                    content = meta.get("content", "")
                    if re.search(r"followers|Followers|people follow|people like this|likes", content, re.IGNORECASE):
                        m = re.search(r"([\d,.\w]+)\s*(?:followers|likes|people follow|people like this)", content, re.IGNORECASE)
                        if m:
                            val = self._as_int(m.group(1))
                            if val and val > 0: return val

                # 2. Visible Text (from user logic)
                text = soup.get_text(separator=" ", strip=True)
                patterns = [
                    r"([0-9,\.]+)\s+people follow",
                    r"([0-9,\.]+)\s+followers",
                    r"([0-9,\.]+)\s+likes",
                ]
                for pat in patterns:
                    m = re.search(pat, text, re.IGNORECASE)
                    if m:
                        val = self._as_int(m.group(1))
                        if val and val > 0: return val

            except Exception as e:
                print(f"FB Error: {e}")
        return None
