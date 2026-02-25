import requests
import re
from bs4 import BeautifulSoup

class SocialScraper:
    def __init__(self):
        # Simplified User-Agent works best for scraping public meta tags
        self.headers = {
            "User-Agent": "Mozilla/5.0"
        }

    def _as_int(self, s):
        """Convert string numbers like '1,004' or '1.2K' to integers."""
        if not s:
            return None
        text = str(s).upper().replace(",", "").strip()
        try:
            if 'K' in text:
                return int(float(text.replace('K', '')) * 1000)
            if 'M' in text:
                return int(float(text.replace('M', '')) * 1000000)
            return int(re.sub(r"[^0-9]", "", text))
        except (ValueError, TypeError):
            return None

    def get_instagram_followers(self, username):
        """Fetch Instagram followers for a given username."""
        print(f"Fetching Instagram followers for1 {username}")
        username = str(username).strip()
        url = f"https://www.instagram.com/{username}/"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.content, "html.parser")
            # Usually found in og:description meta tag
            for tag in soup.find_all("meta"):
                content = tag.get("content", "")
                if "Followers" in content:
                    # Pattern match: "1,004 Followers"
                    m = re.search(r"([\d,.]+)([KMB]?)\s*Followers", content, re.IGNORECASE)
                    if m:
                        return self._as_int(m.group(1) + m.group(2))
            print(f"for2 {self.headers}")
        except Exception as e:
            print(f"Error fetching Instagram ({username}): {e}")
        return None

    def get_facebook_followers(self, identifier):
        """Fetch Facebook Page followers/likes for a given ID or username."""
        identifier = str(identifier).strip()
        url = f"https://www.facebook.com/{identifier}"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            # 1. Check Meta Tags (Description often contains counts)
            for tag in soup.find_all("meta"):
                content = tag.get("content", "")
                if re.search(r"followers|likes|people follow", content, re.IGNORECASE):
                    # Try to find a number followed by keywords
                    m = re.search(r"([\d,.]+)([KMB]?)\s*(?:followers|likes|people follow)", content, re.IGNORECASE)
                    if m:
                        return self._as_int(m.group(1) + m.group(2))
            
            # 2. Heuristic: Search the entire page text
            page_text = soup.get_text(separator=" ", strip=True)
            patterns = [
                r"([\d,.]+)([KMB]?)\s+people follow",
                r"([\d,.]+)([KMB]?)\s+Followers",
                r"([\d,.]+)([KMB]?)\s+likes",
            ]
            for pat in patterns:
                m = re.search(pat, page_text, re.IGNORECASE)
                if m:
                    return self._as_int(m.group(1) + m.group(2))
                    
        except Exception as e:
            print(f"Error fetching Facebook ({identifier}): {e}")
        return None
