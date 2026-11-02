from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_order_display_order_date_order_display_order_number_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="menuvote",
            name="unique_user_vote_per_restaurant_day",
        ),
        migrations.RemoveConstraint(
            model_name="menuvote",
            name="unique_anonymous_vote_per_restaurant_day",
        ),
    ]
