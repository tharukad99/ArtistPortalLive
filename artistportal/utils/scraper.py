import requests
import re
import json
import base64
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
