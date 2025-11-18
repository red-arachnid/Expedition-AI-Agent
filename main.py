import logging
from datetime import datetime
import google.generativeai as genai
from telegram import (ReplyKeyboardMarkup, ReplyKeyboardRemove, Update, InlineKeyboardButton, InlineKeyboardMarkup)
from telegram.ext import (Application, CallbackQueryHandler, CommandHandler, ContextTypes, ConversationHandler, MessageHandler, filters)
from telegram_bot_calendar import (DetailedTelegramCalendar, LSTEP)
from geoapify import (GetCoordinates, SearchPOIs, FindHotel)

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# States for different inputs
START_DATE, END_DATE, LOCATION, OCCASION, BUDGET = range(5)
TELEGRAM_API = "8506070110:AAGn9euLifnSTurA1gXz-6t_fqeTdzmm7bk"

# region INPUT STATES
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    calendar, step = DetailedTelegramCalendar().build()

    await update.message.reply_text(
        (
            '<b>Welcome to the Expedition AI Trip Planning Assistant!</b>\n\n'
            'I\'m here to help you draft the perfect itinerary by capturing all the key details for your upcoming trip.\n'
            'Let\'s begin by setting the timeframe for your journey.\n\n'
            '<b>Please Select Your Start Date:</b>'
        ),
        parse_mode='HTML',
    )
    await update.message.reply_text(
        f"Select {LSTEP[step]}",
        parse_mode='MarkdownV2',
        reply_markup=calendar,
    )
    
    context.user_data['current_state'] = START_DATE
    return START_DATE

async def calendar_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    current_state = context.user_data.get('current_state') #Retuning the current state (START_DATE OR END_DATE)
    result, key, step = DetailedTelegramCalendar().process(query.data) #step here indicates Year->Month->Day

    if not result and key:
        await context.bot.edit_message_text(
            (
                f"Select {LSTEP[step]}"
            ),
            parse_mode='MarkdownV2',
            chat_id=query.message.chat_id,
            message_id=query.message.message_id,
            reply_markup=key,
        )
    elif result:
        # ---START DATE LOG---
        if current_state == START_DATE:
            context.user_data['start_date'] = result.strftime("%Y-%m-%d")
            start_date = context.user_data['start_date'].replace('-', r'\-')
            new_calendar, new_step = DetailedTelegramCalendar(min_date=result).build()

            await context.bot.edit_message_text(
                f"Start Date selected: {start_date}\n\nPlease select the End Date:",
                chat_id=query.message.chat_id,
                message_id=query.message.message_id,
                parse_mode='MarkdownV2',
                reply_markup=new_calendar,
            )
            context.user_data['current_state'] = END_DATE
            return END_DATE

        # ---END DATE LOG---
        elif current_state == END_DATE:
            context.user_data['end_date'] = result.strftime("%Y-%m-%d")
            start_date = context.user_data['start_date'].replace('-', r'\-')
            end_date = context.user_data['end_date'].replace('-', r'\-')
            
            await context.bot.edit_message_text(
                (
                    f"Dates have been selected\!\n\nStart Date: {start_date}\nEnd Date: {end_date}\n\n"
                ),
                parse_mode='MarkdownV2',
                chat_id=query.message.chat_id,
                message_id=query.message.message_id
            )
            await context.bot.send_message(
                chat_id=query.message.chat_id,
                text=(
                    '<b>Specify Your Destination</b>\n\n'
                    'Kindly provide the desired city or region for your expedition (e.g., "Paris, France", "Kyoto, Japan", or "Machu Picchu").'
                ),
                parse_mode='HTML',
            )

            context.user_data['current_state'] = LOCATION
            return LOCATION
        
    return current_state

async def get_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    location_text = update.message.text
    context.user_data['location'] = location_text

    lon, lat = GetCoordinates(location_text)
    if not lon and not lat:
        #The coordinates for the following input was not found
        await update.message.reply_text(
            'The location you entered was not found.\nPlease Enter a suitable location for your trip.',
            parse_mode='HTML'
        )
        return LOCATION

    context.user_data['lon'] = lon
    context.user_data['lat'] = lat
    # Setting keyboard for next input (occasion)
    reply_keyboard = [['Adventure', 'Relaxation', 'Business', 'Family Trip', 'Cultural']] 

    await update.message.reply_text(
        (
            f"Cool\! We've got {location_text} locked in for the destination\.\n\n"
            f"What's the main occasion or goal for this trip?"
        ),
        parse_mode='MarkdownV2',
        reply_markup=ReplyKeyboardMarkup(reply_keyboard, one_time_keyboard=True, resize_keyboard=True),
    )
    
    context.user_data['current_state'] = OCCASION
    return OCCASION

async def get_occasion(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    occasion_text = update.message.text
    context.user_data['occasion'] = occasion_text

    await update.message.reply_text(
        (
            f"Sweet, a trip for {occasion_text}\!\n\n"
            f"Okay, last big detail: what's your estimated **budget** in USD? Just type the number \(like 5000 or 1500\.50\)\."
        ),
        parse_mode='MarkdownV2',
        reply_markup=ReplyKeyboardRemove()
    )

    context.user_data['current_state'] = BUDGET
    return BUDGET

async def get_budget(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    budget_text = update.message.text

    try:
        budget = float(budget_text)

        if budget <= 0:
            #Budget is negative so retry
            await update.message.reply_text(
                'Your budget must be positive number.\nPlease enter a valid amount in USD.',
                parse_mode='HTML',
            )
            return BUDGET
        
        context.user_data['budget'] = budget
    except:
        #Budget was not a number input so try again
        await update.message.reply_text(
            "That doesn't look like a valid number.\nPlease enter your budget in only digit (e.g., 3000 or 5000).",
            parse_mode='HTML',
        )
        return BUDGET

    await update.message.reply_text(
        (
            f"Thank you for the details\!\n\n"
            f"**Summary of Expedition Inputs:**\n"
            f"Dates: {context.user_data['start_date'].replace('-', r'\-')} to {context.user_data['end_date'].replace('-', r'\-')}\n"
            f"Location: {context.user_data['location']}\n"
            f"Occasion: {context.user_data['occasion']}\n"
            f"Budget: ${budget_text}"
        ),
        parse_mode='MarkdownV2',
    )

    await process_data(update, context)
    return ConversationHandler.END

# endregion

# region DATA PROCESS

async def process_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    lon = context.user_data['lon']
    lat = context.user_data['lat']
    occasion = context.user_data['occasion']

    # ----SEARCHING POINT OF INTEREST----
    if lon and lat:
        pois = SearchPOIs(lon=lon, lat=lat, user_category=occasion)
        limit = 5 #set this depending on the trip duration (max 10)
        if pois:
            message_text = "<b>Here are some points of interest I found for you:</b>\n\n"
            for i, feature in enumerate(pois):
                properties = feature.get("properties", {})
                place_name = properties.get("name", None)
                place_address = properties.get("formatted", None)

                if place_name and place_address:
                    message_text += f"<b>{i+1}. {place_name}</b>\n"
                    message_text += f"   <i>Address:</i> {place_address}\n\n"
                if i > limit:
                    break
            
            await update.message.reply_text(
                text=message_text,
                parse_mode='HTML'
            )
        else:
            await update.message.reply_text(
                "Sorry, I couldn't find any point of interest matching your location."
            )
    else:
        await update.message.reply_text(
            text='SAD',
            parse_mode='HTML'
        )

    # ----SEACHING HOTELS----
    total_budget = context.user_data['budget']
    check_in_date = context.user_data['start_date']
    check_out_date = context.user_data['end_date']

    try:
        start_dt = datetime.strptime(check_in_date, '%Y-%m-%d')
        end_dt = datetime.strptime(check_out_date, '%Y-%m-%d')
        nights = (end_dt-start_dt).days
        if nights <= 0:
            nights = 1
    except ValueError:
        await update.message.reply_text("Error calculating trip duration.")
        return ConversationHandler.END
    
    hotel_budget = total_budget * 0.40
    per_night_budget = hotel_budget / nights

    await update.message.reply_text(
        f"Searching for hotels under <b>${per_night_budget:.2f}/night</b>...",
        parse_mode='HTML'
    )

    hotel_offers = FindHotel(
        lon=lon,
        lat=lat,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        price_per_night=per_night_budget
    )

    if hotel_offers:
        hotel_message = "<b>Here are the top hotel deals I found within your budget:</b>\n\n"

        for offer in hotel_offers[:3]:
            hotel_name = offer.get('hotel', {}).get('name', 'Hotel Name Not Found')
            price = offer.get('offers', [{}])[0].get('price', {}).get('total', '??')
            
            hotel_message += f"<b>Hotel Name: {hotel_name}</b>\n"
            hotel_message += f"   <i>Total Price:</i> ${price} USD\n\n"    
        
        await update.message.reply_text(hotel_message, parse_mode='HTML')
    else:
        await update.message.reply_text(
            "Sorry, I couldn't find any hotels that match your budget and location."
        )

    return ConversationHandler.END

# endregion

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text('Bye! Hope to talk to you again soon.', reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END


def main() -> None:
    application = Application.builder().token(TELEGRAM_API).build()

    async def start_with_state(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        context.user_data['current_state'] = START_DATE
        return await start(update, context)
    
    conversation_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start_with_state)],
        states={
            START_DATE: [CallbackQueryHandler(calendar_handler)],
            END_DATE: [CallbackQueryHandler(calendar_handler)],
            LOCATION: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_location)],
            OCCASION: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_occasion)],
            BUDGET: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_budget)],
        },
        fallbacks=[CommandHandler('cancel', cancel)],
    )

    application.add_handler(conversation_handler)
    application.add_handler(CommandHandler('start', start))
    application.run_polling()

if __name__ == '__main__':
    main()