from strands import tool


RESOURCES = {
    "python": [("Python Tutorial (official)", "https://docs.python.org/3/tutorial/"), ("CS50P: Introduction to Programming with Python", "https://cs50.harvard.edu/python/")],
    "javascript": [("MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide")],
    "web": [("MDN Learn Web Development", "https://developer.mozilla.org/en-US/docs/Learn_web_development")],
    "computer science": [("CS50x: Introduction to Computer Science", "https://cs50.harvard.edu/x/")],
    "algorithms": [("VisuAlgo", "https://visualgo.net/en")],
    "git": [("Pro Git Book", "https://git-scm.com/book/en/v2")],
    "java": [("Dev.java Learning", "https://dev.java/learn/")],
    "sql": [("SQLBolt interactive lessons", "https://sqlbolt.com/")],
}


@tool
def learning_resource_finder(topic: str) -> str:
    """Find curated learning links from known, reliable sources.

    Use when a student asks for learning resources, tutorials, or a place to study a topic.
    Args:
        topic: A short subject such as Python, algorithms, or web development.
    """
    query = topic.lower()
    matches = [(label, url) for key, items in RESOURCES.items() if key in query or query in key for label, url in items]
    if not matches:
        return "No curated link is available for that topic yet. Ask the student which language or subject they want to learn, or explain the concept directly."
    return "Curated resources (share these exact URLs):\n" + "\n".join(f"- {label}: {url}" for label, url in matches)
