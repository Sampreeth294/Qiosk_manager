import os
import sys

# Set up Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from core.models import Restaurant, MenuCategory, MenuItem

def seed_canteen():
    restaurant = Restaurant.objects.first()
    if not restaurant:
        restaurant = Restaurant.objects.create(
            name="BMS College Canteen",
            address="Campus Food Court, Ground Floor",
            phone_number="9876543210",
            is_active=True,
        )
        print(f"Created default restaurant: {restaurant.name}")
    else:
        print(f"Using existing restaurant: {restaurant.name} (id={restaurant.id})")

    # Categories
    categories_data = [
        {"name": "Breakfast", "description": "Authentic crispy dosas, fluffy idlis, hot vadas and morning tiffin."},
        {"name": "Lunch", "description": "Hearty rice varieties, traditional thalis, chapatis and spicy curries."},
        {"name": "Snacks", "description": "Crispy chaats, gobi manchurian, evening pakodas and bites."},
        {"name": "Ice Creams", "description": "Chilled cones, kulfis, sundaes and sweet delights."},
        {"name": "Beverages", "description": "South Indian filter coffee, ginger cardamom tea and cool refreshments."},
    ]

    cat_map = {}
    for c_data in categories_data:
        cat, created = MenuCategory.objects.get_or_create(
            restaurant=restaurant,
            name=c_data["name"],
            defaults={"description": c_data["description"], "is_active": True}
        )
        cat_map[c_data["name"]] = cat
        print(f"{'Created' if created else 'Found'} category: {cat.name}")

    # Menu items with images
    items_data = [
        # Breakfast
        {
            "category": "Breakfast",
            "name": "Masala Dosa",
            "price": "50.00",
            "description": "Crisp golden fermented crepe filled with spiced potato masala, served with coconut chutney & sambar.",
            "image": "menu_items/masala_dosa.jpg"
        },
        {
            "category": "Breakfast",
            "name": "Idli Vada Combo",
            "price": "45.00",
            "description": "Two soft steamed fluffy rice cakes paired with a crisp golden medu vada, fresh coconut chutney & hot sambar.",
            "image": "menu_items/idli.jpg"
        },
        {
            "category": "Breakfast",
            "name": "Medu Vada (2 Pcs)",
            "price": "35.00",
            "description": "Crispy fried savory lentil doughnuts spiced with black pepper, ginger, and curry leaves.",
            "image": "menu_items/vada.jpg"
        },
        {
            "category": "Breakfast",
            "name": "Chow Chow Bath",
            "price": "55.00",
            "description": "Iconic Karnataka duo: spicy savory Khara Bath (Upma) paired with sweet aromatic Kesari Bath.",
            "image": "menu_items/chow_chow_bath.jpg"
        },
        {
            "category": "Breakfast",
            "name": "Poori Sagu (3 Pcs)",
            "price": "45.00",
            "description": "Fluffy deep-fried golden whole wheat pooris served with spiced potato and mixed vegetable sagu.",
            "image": "menu_items/poori.jpg"
        },
        {
            "category": "Breakfast",
            "name": "Ghee Pongal",
            "price": "40.00",
            "description": "Comforting ven pongal rice and yellow lentils cooked in pure ghee, tempered with cumin, crushed pepper & cashews.",
            "image": "menu_items/pongal.jpg"
        },

        # Lunch
        {
            "category": "Lunch",
            "name": "Bisi Bele Bath",
            "price": "50.00",
            "description": "Traditional Karnataka hot lentil rice loaded with country vegetables, spicy aromatic masala and topped with boondi.",
            "image": "menu_items/bisi_bele_bath.jpg"
        },
        {
            "category": "Lunch",
            "name": "Lemon Rice",
            "price": "40.00",
            "description": "Tangy zesty rice tempered with fresh lemon juice, mustard seeds, green chillies, curry leaves and roasted peanuts.",
            "image": "menu_items/lemon_rice.jpg"
        },
        {
            "category": "Lunch",
            "name": "Curd Rice",
            "price": "40.00",
            "description": "Cooling homestyle creamy curd rice garnished with fresh coriander, pomegranate pearls, and mustard tempering.",
            "image": "menu_items/curd_rice.jpg"
        },
        {
            "category": "Lunch",
            "name": "South Indian Sambar Meals",
            "price": "60.00",
            "description": "Steaming hot sonamasuri rice served with drumstick sambar, rasam, palya, pickle, and crisp appalam.",
            "image": "menu_items/rice_sambar.jpg"
        },
        {
            "category": "Lunch",
            "name": "Chapati Meals (3 Pcs)",
            "price": "45.00",
            "description": "Soft hand-rolled whole wheat chapatis served with rich vegetable kurma, dal, and fresh salad.",
            "image": "menu_items/chapati.jpg"
        },
        {
            "category": "Lunch",
            "name": "Kerala Malabar Parotta",
            "price": "50.00",
            "description": "Flaky, layered multi-layered griddle-toasted parotta served with a fragrant spicy vegetable salna.",
            "image": "menu_items/parotta.jpg"
        },

        # Snacks
        {
            "category": "Snacks",
            "name": "Gobi Manchurian",
            "price": "60.00",
            "description": "Crisp cauliflower florets wok-tossed with ginger, garlic, capsicum, spring onions and savory Indo-Chinese sauces.",
            "image": "menu_items/gobi.jpg"
        },
        {
            "category": "Snacks",
            "name": "Bhel Puri",
            "price": "35.00",
            "description": "Crunchy puffed rice tossed with finely chopped onions, tomatoes, raw mango, crispy sev, and sweet-tangy chutneys.",
            "image": "menu_items/bhel_puri.jpg"
        },
        {
            "category": "Snacks",
            "name": "Masala Puri",
            "price": "40.00",
            "description": "Crisp hollow puris crushed and bathed in steaming hot spiced dried green pea gravy, topped with onions, tomatoes and sev.",
            "image": "menu_items/masala_puri.png"
        },
        {
            "category": "Snacks",
            "name": "Pani Puri (6 Pcs)",
            "price": "35.00",
            "description": "Crisp golden puris packed with spicy potato filling, served with chilled mint-coriander teekha pani and sweet saunth.",
            "image": "menu_items/panipuri.jpg"
        },
        {
            "category": "Snacks",
            "name": "Mysore Bhajji (Bonda)",
            "price": "30.00",
            "description": "Fluffy, crispy deep-fried batter fritters with coconut bits, ginger and crushed peppercorns. Served with spicy chutney.",
            "image": "menu_items/mysore_bhajji.jpg"
        },
        {
            "category": "Snacks",
            "name": "Nipattu Masala",
            "price": "30.00",
            "description": "Crunchy Bangalore nipattu crackers sandwiched with seasoned grated carrots, onions, roasted peanuts and chutney.",
            "image": "menu_items/nipattu_masala.jpg"
        },

        # Ice Creams
        {
            "category": "Ice Creams",
            "name": "Vanilla Ice Cream",
            "price": "35.00",
            "description": "Classic creamy smooth Madagascar vanilla bean scoop.",
            "image": "menu_items/Vanilla_Ice_Cream.jpg"
        },
        {
            "category": "Ice Creams",
            "name": "Strawberry Ice Cream",
            "price": "40.00",
            "description": "Vibrant and fruity strawberry scoop prepared with real berry extracts.",
            "image": "menu_items/strawberry_ice_cream.jpg"
        },
        {
            "category": "Ice Creams",
            "name": "Ice Cream with Chocolate Sauce",
            "price": "50.00",
            "description": "Generous double scoop of rich vanilla ice cream drizzled with warm chocolate fudge syrup and nuts.",
            "image": "menu_items/Ice_cream_with_chocolate_syrup.jpg"
        },
        {
            "category": "Ice Creams",
            "name": "Kesar Pista Kulfi",
            "price": "40.00",
            "description": "Traditional slow-simmered Indian milk bar infused with saffron strands and slivered pistachios.",
            "image": "menu_items/kulfi.jpg"
        },
        {
            "category": "Ice Creams",
            "name": "Chocolate Choco-Bar",
            "price": "30.00",
            "description": "Creamy vanilla ice cream stick coated in a thick, crunchy milk chocolate shell.",
            "image": "menu_items/chocolate_bar.jpg"
        },

        # Beverages
        {
            "category": "Beverages",
            "name": "South Indian Filter Coffee",
            "price": "20.00",
            "description": "Freshly brewed decoction with chicory and frothy hot full-cream milk, served in classic brass tumbler style.",
            "image": "menu_items/coffee.jpg"
        },
        {
            "category": "Beverages",
            "name": "Kadak Masala Chai",
            "price": "15.00",
            "description": "Strong aromatic Indian black tea brewed with fresh crushed ginger, cardamom pods, and spices.",
            "image": "menu_items/tea.jpg"
        },
        {
            "category": "Beverages",
            "name": "Fresh Mint Lemonade",
            "price": "25.00",
            "description": "Chilled freshly squeezed lemon cooler with crushed mint leaves and black salt.",
            "image": "menu_items/lemanade.jpg"
        },
        {
            "category": "Beverages",
            "name": "Coca-Cola (Chilled)",
            "price": "25.00",
            "description": "Chilled 250ml bottle of crisp Coca-Cola.",
            "image": "menu_items/coco_cola.jpg"
        },
        {
            "category": "Beverages",
            "name": "Thums Up (Chilled)",
            "price": "25.00",
            "description": "Taste the thunder - ice chilled carbonated fizzy cola.",
            "image": "menu_items/thumsup.jpg"
        },
    ]

    for item_data in items_data:
        cat = cat_map[item_data["category"]]
        item, created = MenuItem.objects.update_or_create(
            category=cat,
            name=item_data["name"],
            defaults={
                "price": item_data["price"],
                "description": item_data["description"],
                "image": item_data["image"],
                "is_active": True,
            }
        )
        print(f"{'Created' if created else 'Updated'} menu item: {item.name} - ₹{item.price}")

    print("Canteen menu seeding completed successfully!")

if __name__ == "__main__":
    seed_canteen()
