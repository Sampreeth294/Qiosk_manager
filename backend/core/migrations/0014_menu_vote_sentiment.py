from django.db import migrations, models
from django.db.models import Q


def set_existing_votes_to_like(apps, schema_editor):
    MenuVote = apps.get_model("core", "MenuVote")
    MenuVote.objects.filter(menu_item__isnull=False).update(sentiment="LIKE")


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0013_allow_menu_vote_abstentions"),
    ]

    operations = [
        migrations.AddField(
            model_name="menuvote",
            name="sentiment",
            field=models.CharField(
                blank=True,
                choices=[("LIKE", "Like"), ("DISLIKE", "Dislike")],
                max_length=7,
                null=True,
            ),
        ),
        migrations.RunPython(set_existing_votes_to_like, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="menuvote",
            constraint=models.CheckConstraint(
                condition=(
                    Q(("menu_item__isnull", True), ("sentiment__isnull", True))
                    | Q(
                        ("menu_item__isnull", False),
                        ("sentiment__in", ["LIKE", "DISLIKE"]),
                    )
                ),
                name="menu_vote_sentiment_matches_item",
            ),
        ),
    ]
