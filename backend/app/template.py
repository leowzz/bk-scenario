from datetime import date, datetime, timezone
from jinja2 import Template, TemplateError
from typing import Any


def _template_builtins() -> dict[str, Any]:
    """模板内置函数/变量，供 Jinja2 渲染时注入。"""
    return {
        "now": lambda: datetime.now(),
        "utcnow": lambda: datetime.now(timezone.utc),
        "today": lambda: date.today(),
        "strftime": lambda obj, fmt: obj.strftime(fmt) if hasattr(obj, "strftime") else "",
    }


class TemplateRenderer:
    """
    节点配置模板渲染，基于 Jinja2。

    内置函数（在模板中可直接调用）：
        - ``now()`` : 当前 datetime（本地）
        - ``utcnow()`` : 当前 datetime（UTC）
        - ``today()`` : 当前 date
        - ``strftime(obj, fmt)`` : 对 date/datetime 格式化，如 ``strftime(now(), '%Y-%m-%d')``
    """

    @staticmethod
    def render(template_str: str, variables: dict[str, Any]) -> str:
        try:
            template = Template(template_str)
            ctx = {**_template_builtins(), **variables}
            return template.render(**ctx)
        except TemplateError as exc:
            return f"[模板渲染错误] {exc}"
        except Exception as exc:
            return f"[渲染异常] {exc}"

    @staticmethod
    def render_sql(sql: str, variables: dict[str, Any]) -> str:
        """对 SQL 片段做模板渲染，与 render 共用同一内置函数。"""
        return TemplateRenderer.render(sql, variables)
