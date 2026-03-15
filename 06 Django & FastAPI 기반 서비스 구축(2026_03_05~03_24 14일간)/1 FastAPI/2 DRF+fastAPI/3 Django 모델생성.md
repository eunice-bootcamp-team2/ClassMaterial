ERD 기반으로 실제 Django 모델을 각 앱에 작성하고 → 마이그레이션으로 테이블을 생성

순서
1️⃣ accounts  
2️⃣ products  
3️⃣ reviews  
4️⃣ interactions  
5️⃣ ai_gateway (모델 없음)

---
1️⃣ accounts models

`backend/apps/accounts/models.py`
```python
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    사용자 모델
    """

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
```
---

2️⃣ products  models

`backend/apps/products/models.py`
```python
from django.db import models


class Product(models.Model):
    """
    제품 모델
    """

    name = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
        null=True
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name
```
---
3️⃣ reviews  models

`backend/apps/reviews/models.py`
```python
from django.db import models
from django.conf import settings

from apps.products.models import Product


User = settings.AUTH_USER_MODEL


class Review(models.Model):
    """
    제품 리뷰
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    content = models.TextField()

    rating = models.IntegerField()

    is_public = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.product} - {self.user}"


class ReviewImage(models.Model):

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="reviews/"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    

class ReviewAI(models.Model):

    review = models.OneToOneField(
        Review,
        on_delete=models.CASCADE,
        related_name="ai_result"
    )

    sentiment = models.CharField(
        max_length=50
    )

    confidence = models.FloatField()

    keywords = models.JSONField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
```
---
4️⃣ interactions  models

`backend/apps/interactions/models.py`
```python
from django.db import models
from django.conf import settings

from apps.reviews.models import Review


User = settings.AUTH_USER_MODEL


class ReviewLike(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="likes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ("user", "review")
 
       
class ReviewBookmark(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="bookmarks"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    

class ReviewComment(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="comments"
    )

    content = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    

class ReviewReport(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="reports"
    )

    reason = models.CharField(
        max_length=255
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
```

