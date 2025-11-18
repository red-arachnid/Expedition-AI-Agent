import requests
from amadeus import Client,Location, ResponseError

GEOAPIFY_API_KEY = "5484b44f05ad45b2ac45ce2de50ff977" #FOR LOCATION FINDING
AMADEUS_API_KEY = "eRGDjfJ5zDcjSSNzaUUNzSZGrtHIAx52" #FOR HOTEL BOOKING
AMADEUS_API_SECRET = "k568R5RuAvIbiVTI"
PLACES_ENDPOINT = "https://api.geoapify.com/v2/places"
GEOCODE_ENDPOINT = "https://api.geoapify.com/v1/geocode/search"
AMADEUS_ENDPOINT = "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode"

def GetCoordinates(location: str) -> tuple[float, float]:
    geocode_params = {
        "text": location,
        "limit": 1,
        "apiKey": GEOAPIFY_API_KEY,
    }
    
    try:
        response = requests.get(GEOCODE_ENDPOINT, params=geocode_params)
        response.raise_for_status()
        data = response.json()

        if (data.get("features")):
            match = data["features"][0]["properties"]
            longitude = match["lon"]
            latitude = match["lat"]
            return (longitude, latitude)
        else:
            #No location on those coordinates return Null
            return (None, None)
    
    except requests.exceptions.RequestException as e:
        print(f"An error occured: {e}")


#Edit Later
CATEGORY_MAP = {
    "Adventure": "catering.restaurant,service.financial,commercial.convenience",
    "Relaxation": "leisure.playground,entertainment.amusement_park,tourism.attraction,education.library",
    "Business": "tourism.sights,entertainment.culture.museum,tourism.history,tourism.heritage",
    "Family Trip": "leisure.park,natural.water,natural.mountain,natural.valley",
    "Cultural": "catering.bar,catering.pub,entertainment.night_club,entertainment.culture.cinema"
}

def SearchPOIs(lon: float, lat: float, user_category: str) -> list:
    categories = CATEGORY_MAP.get(user_category, "tourism.sights") #tourism.sights is default if category could not be found
    bias_string = f"proximity:{lon},{lat}"
    params = {
        "categories": categories,
        "bias": bias_string,
        "limit": 5,
        "apiKey": GEOAPIFY_API_KEY
    }

    try:
        response = requests.get(PLACES_ENDPOINT, params=params)
        response.raise_for_status()
        data = response.json()

        pois = data.get("features", [])
        if pois:
            #Found POIS
            #Can return POIS here
            print("Found POIS")
            return pois
            # for i, feature in enumerate(pois):
            #     prop = feature["properties"]
            #     place_name = prop.get("name", "Unnamed Place")
            #     place_address = prop.get("formatted", "Address unavailable")

            #     print(f"[{i+1}] {place_name}")
            #     print(f"      Address: {place_address}")
        else:
            print(f"No points of interest found for '{user_category}' at '{lon}','{lat}'")
            return None

    except requests.exceptions.RequestException as e:
        print(f"Geoapify API Error: {e}")

# SearchPOIs(135.74, 35.052, "Business Trip")


#LATER FIX THIS FOR FINDING HOTELS
def FindHotel(lon: float, lat: float, check_in_date: str, check_out_date: str, price_per_night: float) -> list:
    try:
        amadeus = Client(
            client_id=AMADEUS_API_KEY,
            client_secret=AMADEUS_API_SECRET
        )
        print("Amadeus Client Initialized successfully.")

        # response = amadeus.shopping.hotel_offers_search.get(
        #     longitude=lon,
        #     latitude=lat,
        #     checkInDate=check_in_date,
        #     checkOutDate=check_out_date,
        #     sort='PRICE',
        #     priceRange=f"0-{int(price_per_night)}",
        #     currency="USD"
        # )
        # print(response.data)
        param = {
            "latitude": lat,
            "longitude": lon,
        }
        response = requests.get(AMADEUS_ENDPOINT, params=param)
        print(response)
        # return response.data
    except Exception as e:
        print(f"Error initializing Amadeus Client: {e}")
        return None

FindHotel(135.74, 35.052, "2025-12-1", "2025-12-7", 300)
# FindHotel(135.7681, 35.0116, "2025-12-01", "2025-12-05")
