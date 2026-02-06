from jinja2 import Template, TemplateError
from typing import Any


class TemplateRenderer:
    @staticmethod
    def render(template_str: str, variables: dict[str, Any]) -> str:
        try:
            template = Template(template_str)
            return template.render(**variables)
        except TemplateError as exc:
            return f"[模板渲染错误] {exc}"
        except Exception as exc:
            return f"[渲染异常] {exc}"

    @staticmethod
    def render_sql(sql: str, variables: dict[str, Any]) -> str:
        return TemplateRenderer.render(sql, variables)
