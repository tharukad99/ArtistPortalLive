# app.py
from artistportal import create_app
from flask import render_template
from flask_login import login_required, current_user

app = create_app()

#login page
@app.route("/login")
def auth():
    return render_template("login.html")

# artist list page
# @app.route("/artistslist")
# def artist_list_page():
#     return render_template("artists_list.html")

@app.route("/")
def artist_list_page():
    return render_template("index.html")



# DASHBOARD for a specific artist  ← this MUST be named home_page
# @app.route("/artist/<int:artist_id>")
# def home_page(artist_id):
#     return render_template("home.html", artist_id=artist_id)

@app.route("/artist/<int:artist_id>")
def home_page(artist_id):
    return render_template("artist_guest.html", artist_id=artist_id)



# Activities page for that artist
@app.route("/artist/<int:artist_id>/activities")
def activities_page(artist_id):
    return render_template("activities.html", artist_id=artist_id)

# Social Media details page for that artist
@app.route("/artist/<int:artist_id>/social")
def social_media_page(artist_id):
    return render_template("social_media.html", artist_id=artist_id)

# Manage Artists pages by admin only
@app.route("/admin/manage-each-artists")
@login_required
def manage_each_artists_page():
    if int(getattr(current_user, "IsAdmin", 0)) != 1:
        return abort(403)
    return render_template("artist_listEdit.html")

# Manage Artists home page by admin or arytist
@login_required
@app.route("/edit-home/<int:artist_id>")
def manage_home_page(artist_id):
    if (getattr(current_user, "Role", 0)) == 2:
        return render_template("homepageEdit.html", artist_id=artist_id)
    elif int(getattr(current_user, "IsAdmin", 0)) == 1:
        return render_template("homepageEdit.html", artist_id=artist_id)
    return render_template("login.html")

# Manage Artists Activity page by admin or artist
@login_required
@app.route("/edit-activity/<int:artist_id>")
def manage_activities_page(artist_id):
    if (getattr(current_user, "Role", 0)) == 2:
        return render_template("activitypageEdit.html", artist_id=artist_id)
    elif int(getattr(current_user, "IsAdmin", 0)) == 1:
        return render_template("activitypageEdit.html", artist_id=artist_id)
    return render_template("login.html")

# Manage Artists Social Media page by admin or artist
@login_required
@app.route("/edit-Socialmedia/<int:artist_id>")
def manage_social_media_page(artist_id):
    if (getattr(current_user, "Role", 0)) == 2:
        return render_template("social_mediaEdit.html", artist_id=artist_id)
    elif int(getattr(current_user, "IsAdmin", 0)) == 1:
        return render_template("social_mediaEdit.html", artist_id=artist_id)
    return render_template("login.html")

@app.errorhandler(403)
def forbidden(_):
    return render_template("403.html"), 403

if __name__ == "__main__":
    app.run(debug=True)
