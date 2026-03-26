import requests
import re
import json
import base64
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

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
        print(f"Fetching Instagram followers for {username}")
        username = str(username).strip()
        
        # NOTE: Scraping Instagram directly from an Azure/Datacenter IP is highly likely to be 
        # blocked (returning 302 Redirect or 429 Too Many Requests). 
        # For a robust solution in production, uncomment and use a third-party API like RapidAPI below.
        
        """
        # --- RAPIDAPI / THIRD-PARTY API APPROACH (RECOMMENDED FOR AZURE) ---
        url = "https://instagram-scraper-api2.p.rapidapi.com/v1/info"
        querystring = {"username_or_id_or_url": username}
        headers = {
            "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY", # Get this from rapidapi.com
            "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com"
        }
        try:
            response = requests.get(url, headers=headers, params=querystring, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('data', {}).get('follower_count')
        except Exception as e:
            print(f"RapidAPI fallback error: {e}")
        """

        # --- DIRECT SCRAPING APPROACH (OFTEN FAILS ON AZURE DU TO IP BAN) ---
        url = f"https://www.instagram.com/{username}/"
        try:
            # Upgraded headers to look more like a real browser
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Upgrade-Insecure-Requests": "1"
            }
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"Instagram blocked the request (Azure IP block). Status Code: {response.status_code}")
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
            
            print(f"Follower meta tag not found. Instagram may have served a login page. Title: {soup.title.string if soup.title else 'No Title'}")
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

    def get_spotify_followers(self, artist_id):
        """Fetch Spotify followers by scraping public page"""
        print(f"Fetching Spotify followers for {artist_id}")
        url = f"https://open.spotify.com/artist/{artist_id}"
        
        headers = {
            "User-Agent": "Mozilla/5.0"
        }

        try:
            response = requests.get(url, headers=headers, timeout=20)
            response.raise_for_status()

            html = response.text

            # Method 1: Try extracting from initialState base64 JSON block
            initial_state_match = re.search(r'<script id="initialState" type="text/plain">([\s\S]*?)</script>', html)
            if initial_state_match:
                try:
                    encoded_state = initial_state_match.group(1)
                    decoded_state = base64.b64decode(encoded_state).decode('utf-8')
                    data = json.loads(decoded_state)
                    
                    # The structure is usually entities -> items -> spotify:artist:{id} -> stats -> followers
                    artist_key = f"spotify:artist:{artist_id}"
                    stats = data.get("entities", {}).get("items", {}).get(artist_key, {}).get("stats", {})
                    
                    if "followers" in stats:
                        return stats["followers"]
                except Exception:
                    pass

            # Method 2: Fallback to searching the HTML tags directly
            fallback_match = re.search(r'>([^<]+)<\/p><p[^>]*>Followers<\/p>', html)
            if fallback_match:
                followers_str = fallback_match.group(1).replace(",", "").strip()
                if followers_str.isdigit():
                    return int(followers_str)
                    
            # Method 3: Fallback to old follower total pattern inside page tags
            match = re.search(r'"followers":\{"total":(\d+)', html)
            if match:
                return int(match.group(1))

        except Exception as e:
            print(f"Error fetching Spotify ({artist_id}): {e}")
            
        return None

    def get_youtube_subscribers(self, api_key, username):
        """Fetch YouTube subscribers using API"""
        print(f"Fetching YouTube followers for {username}")
        # Step 1: Get the channel ID from the username
        username = username.replace("@", "").strip()
        url_search = "https://www.googleapis.com/youtube/v3/search"
        params_search = {
            "part": "snippet",
            "type": "channel",
            "q": username,
            "maxResults": 1,
            "key": api_key
        }
        try:
            response = requests.get(url_search, params=params_search, timeout=20)
            response.raise_for_status()
            data = response.json()
            if not data.get("items"):
                print(f"YouTube Channel not found for {username}")
                return None
            channel_id = data["items"][0]["id"]["channelId"]

            # Step 2: Get the subscriber count using channel_id
            url_stats = "https://www.googleapis.com/youtube/v3/channels"
            params_stats = {
                "part": "statistics",
                "id": channel_id,
                "key": api_key
            }
            response2 = requests.get(url_stats, params=params_stats, timeout=20)
            response2.raise_for_status()
            data2 = response2.json()
            if not data2.get("items"):
                return None
            
            stats = data2["items"][0]["statistics"]
            sub_count = stats.get("subscriberCount", "0")
            return int(sub_count)
        except Exception as e:
            print(f"Error fetching YouTube ({username}): {e}")
            return None

class LinkExtractor:
    SOCIAL_DOMAINS = {
        "facebook": ["facebook.com", "fb.com"],
        "instagram": ["instagram.com"],
        "twitter_x": ["twitter.com", "x.com"],
        "linkedin": ["linkedin.com"],
        "youtube": ["youtube.com", "youtu.be"],
        "tiktok": ["tiktok.com"],
        "threads": ["threads.net"],
        "bandcamp": ["bandcamp.com"],
        "apple_music": ["music.apple.com"],
        "spotify": ["spotify.com", "open.spotify.com"],
        "soundcloud": ["soundcloud.com"],
    }

    def __init__(self):
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0 Safari/537.36"
            )
        }

    def normalize_url(self, url: str) -> str:
        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        return url

    def is_valid_url(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            return parsed.scheme in ["http", "https"] and parsed.netloc != ""
        except Exception:
            return False

    def extract_social_links(self, website_url: str):
        website_url = self.normalize_url(website_url)
        if not self.is_valid_url(website_url):
            return {}

        try:
            response = requests.get(website_url, headers=self.headers, timeout=15)
            response.raise_for_status()
        except Exception as e:
            print(f"Error fetching {website_url}: {e}")
            return {}

        soup = BeautifulSoup(response.text, "html.parser")
        all_links = set()

        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            full_link = urljoin(website_url, href)
            all_links.add(full_link)

        results = {platform: [] for platform in self.SOCIAL_DOMAINS}

        for link in all_links:
            link_lower = link.lower()
            for platform, domains in self.SOCIAL_DOMAINS.items():
                if any(domain in link_lower for domain in domains):
                    # Basic cleaning: remove trailing slash and query params for comparison
                    clean_link = link.split('?')[0].rstrip('/')
                    if clean_link not in results[platform]:
                        results[platform].append(link)

        return results
