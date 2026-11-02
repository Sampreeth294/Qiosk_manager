import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0012_allow_multiple_menu_votes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="menuvote",
            name="menu_item",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="votes",
                to="core.menuitem",
            ),
        ),
    ]
