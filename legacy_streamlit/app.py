import streamlit as st
import plotly.express as px
import pandas as pd
import extra_streamlit_components as stx
#
# Reduce whitespace around the main container to maximize map size
st.markdown("""
    <style>
        .block-container {
            padding-top: 1rem;
            padding-bottom: 0rem;
            padding-left: 1rem;
            padding-right: 1rem;
        }
    </style>
""", unsafe_allow_html=True)

# Page config
st.set_page_config(page_title="Travel Map", page_icon="🌎", layout="wide")
st.title("🌎 Travel Tracker")
st.write("Mark the places you have visited to visualize them on the map.")

#  -- DATA SETUP -- #################################################################
# Constants
SCOPE_US = "USA (States)"
SCOPE_WORLD = "World"
SCOPE_EU = "Europe"

## List of US States ####################################################
us_states = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]
us_states_defaults = [
    "AL", "AZ", "CA", "CO", "CT", "DE", "FL", "GA", "LA", 
    "ME", "MD", "MA", "MS", "MT", "NV", "NH", "NJ", 
    "NY", "NC", "OH", "OR", "PA", "RI", "SC", "TX", "UT",
    "VT", "VA", "WA", "WY"
    #
    # "AK","AR", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "MI", 
    # "MN", "MO",  "NE", 
    # "ND", "NM", "OK",  "SD", "TN", "WV", "WI", 
]
countries_euro_defaults = [
    "Austria", "Belgium", "Czechia", "Denmark", "France", "Germany", "Greece",
    "Hungary", "Iceland", "Ireland", "Italy", "Netherlands", "Portugal",
    "Slovak Republic", "Slovenia",  "Spain", "Switzerland", "United Kingdom"
]
countries_world_defaults = countries_euro_defaults + [
    "United States", "Canada", "Egypt", "Japan",  "New Zealand", "Tunisia", "Turkey" 
]

## List of Countries (using ISO-3 code for better mapping, or standard names) ###########################
# Use a comprehensive ISO-3166 dataset to get all countries and regions:
@st.cache_data
def load_country_data():
    url = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv"
    df = pd.read_csv(url)
    # Map formal ISO names to common names to match defaults and Plotly's fuzzy matching
    df['name'] = df['name'].replace({
        "United States of America": "United States",
        "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
        "Russian Federation": "Russia",
        "Netherlands, Kingdom of the": "Netherlands",
        "Slovakia": "Slovak Republic",
        "Korea (Republic of)": "South Korea",
        "Viet Nam": "Vietnam",
        "Moldova, Republic of": "Moldova",
        "Türkiye": "Turkey",
    })
    return df
#
df_geo = load_country_data()
all_countries = df_geo['name'].unique().tolist()
europe_countries = df_geo[df_geo['region'] == 'Europe']['name'].unique().tolist()

# SIDEBAR ###########################################################################
map_type = st.sidebar.radio("Map Scope", [SCOPE_US, SCOPE_WORLD, SCOPE_EU])

# COOKIE DEFAULTS ###################################################################
cookie_manager = stx.CookieManager(key="cookie_manager")
cookie_states = cookie_manager.get("visited_states")
cookie_countries = cookie_manager.get("visited_countries")

# Initialize Session State from Cookies or Defaults
if "visited_states" not in st.session_state:
    # Use cookie if available, otherwise empty list (or you could use us_states_defaults)
    st.session_state.visited_states = cookie_states if cookie_states is not None else []

if "visited_countries" not in st.session_state:
    # Use cookie if available, otherwise defaults
    st.session_state.visited_countries = cookie_countries if cookie_countries is not None else countries_world_defaults

# MAIN CONTENT ######################################################################
## USA MAP ##########################################################################
if map_type == SCOPE_US:
    st.sidebar.header("🇺🇸 Select States Visited")
    
    # Multi-select for states
    # We use the key 'visited_states' to bind directly to session state
    visited_states = st.sidebar.multiselect(
        "Choose states:", 
        options=us_states,
        key="visited_states"
    )
    
    # Save to cookie if changed
    # Note: We check against the session state variable
    if cookie_states != st.session_state.visited_states:
        # Prevent overwriting if cookie is loading (None) and selection hasn't changed from default
        if cookie_states is None and not st.session_state.visited_states:
            pass
        else:
            cookie_manager.set("visited_states", st.session_state.visited_states)
    
    # Create DataFrame for plotting
    # We create a dataframe with ALL states, and mark 'Visited' as 1 or 0
    df_states = pd.DataFrame({"State": us_states})
    df_states['Visited'] = df_states['State'].apply(lambda x: 1 if x in st.session_state.visited_states else 0)
    
    # Plot USA Map
    fig = px.choropleth(
        df_states,
        locations='State', 
        locationmode="USA-states",
        color='Visited',
        color_continuous_scale=["#f0f3f6", "#00cc96"], # Light grey to Green
        range_color=(0, 1),
        scope="usa",
        title="States I Have Visited",
        height=800,
        hover_name="State",
        hover_data={'Visited': False, 'State': False}
    )
    fig.update_layout(
        coloraxis_showscale=False, 
        margin={"r":0,"t":50,"l":0,"b":0},
        clickmode="event+select"
    )
    
    # Display map with selection enabled
    event = st.plotly_chart(fig, use_container_width=True, on_select="rerun", selection_mode="points")
    
    # Handle Map Click
    if event and len(event['selection']['points']) > 0:
        clicked_point = event['selection']['points'][0]
        clicked_state = clicked_point['location']
        
        if clicked_state in st.session_state.visited_states:
            st.session_state.visited_states.remove(clicked_state)
        else:
            st.session_state.visited_states.append(clicked_state)
            cookie_manager.set("visited_states", st.session_state.visited_states)
        #st.rerun()

    # Stats
    st.info(f"You have visited **{len(st.session_state.visited_states)}** out of 50 states ({len(st.session_state.visited_states)/50:.1%}).")

## WORLD / EUROPE MAP ##############################################################
elif map_type == SCOPE_WORLD or map_type == SCOPE_EU:
    st.sidebar.header("🌍 Select Countries Visited")
    
    # Multi-select for countries
    countries_show = all_countries if map_type == SCOPE_WORLD else europe_countries
    
    # Sync Logic: Ensure the widget reflects the current master list for this view
    # We calculate what should be selected based on the master list
    current_view_selected = [c for c in st.session_state.visited_countries if c in countries_show]
    
    # Initialize widget state if needed or if scope changed
    if "widget_countries" not in st.session_state:
        st.session_state.widget_countries = current_view_selected
    
    # Detect scope change to refresh widget
    if "last_map_scope" not in st.session_state:
        st.session_state.last_map_scope = map_type
    if st.session_state.last_map_scope != map_type:
        st.session_state.widget_countries = current_view_selected
        st.session_state.last_map_scope = map_type

    # Render Widget
    visited_countries_widget = st.sidebar.multiselect(
        "Choose countries:", 
        options= countries_show,
        key="widget_countries"
    )
    
    # Update Master List from Widget (User Input)
    # If the widget selection differs from what we expect (current_view_selected), the user changed it.
    # Note: We must be careful not to overwrite if the change came from the map click (handled below).
    # But since map click reruns the script, current_view_selected will be updated before we get here.
    if set(visited_countries_widget) != set(current_view_selected):
        # 1. Keep countries that are NOT in the current view (preserved from hidden views)
        preserved_hidden = [c for c in st.session_state.visited_countries if c not in countries_show]
        # 2. Update master list
        st.session_state.visited_countries = preserved_hidden + visited_countries_widget
        # Update local variable for stats display
        current_view_selected = visited_countries_widget
    
    # Save to cookie if master list changed
    if cookie_countries != st.session_state.visited_countries:
        # Prevent overwriting if cookie is loading (None) and selection hasn't changed from default
        if cookie_countries is None and st.session_state.visited_countries == countries_world_defaults:
            pass
        else:
            cookie_manager.set("visited_countries", st.session_state.visited_countries)
    
    # Create DataFrame for plotting
    df_countries = pd.DataFrame({"Country": countries_show})
    df_countries['Visited'] = df_countries['Country'].apply(lambda x: 1 if x in st.session_state.visited_countries else 0)
    
    # Plot World Map
    fig = px.choropleth(
        df_countries,
        locations='Country',
        locationmode='country names',
        color='Visited',
        color_continuous_scale=["#f0f2f6", "#636efa"], # Light grey to Blue
        range_color=(0, 1),
        scope="europe" if map_type == SCOPE_EU else "world",
        title="Countries I Have Visited",
        height=800,
        hover_name="Country",
        hover_data={'Visited': False, 'Country': False}
    )
    fig.update_layout(
        coloraxis_showscale=False, 
        margin={"r":0,"t":50,"l":0,"b":0},
        clickmode="event+select"
    )
    
    event = st.plotly_chart(fig, use_container_width=True, on_select="rerun", selection_mode="points")
    
    if event and len(event['selection']['points']) > 0:
        clicked_point = event['selection']['points'][0]
        clicked_country = clicked_point['location']
        
        if clicked_country in st.session_state.visited_countries:
            st.session_state.visited_countries.remove(clicked_country)
        else:
            st.session_state.visited_countries.append(clicked_country)
        
        # Force widget update on next rerun
        st.session_state.widget_countries = [c for c in st.session_state.visited_countries if c in countries_show]
        #st.rerun()

    # Stats
    st.info(f"You have visited **{len(current_view_selected)}** {'European' if map_type == SCOPE_EU else ''} countries.")
