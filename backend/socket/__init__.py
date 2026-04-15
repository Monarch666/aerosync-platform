# Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License
#
# COMPATIBILITY SHIM — DO NOT DELETE THIS FILE
#
# The 'socket/' directory exists as a side-effect of early development.
# It MUST stay here because Python would otherwise shadow its own built-in
# 'socket' stdlib module (since 'backend/' is on sys.path).
#
# This __init__.py loads the real stdlib socket module and replaces itself
# in sys.modules, making this package completely transparent.
#
# Real Socket.IO code lives in: backend/realtime/

import sys
import os
import importlib.util

# Locate stdlib socket.py
_stdlib_socket_path = os.path.join(os.path.dirname(os.__file__), 'socket.py')

# Load it under a private name to avoid recursion
_spec = importlib.util.spec_from_file_location('_real_stdlib_socket', _stdlib_socket_path)
_real_socket_mod = importlib.util.module_from_spec(_spec)
sys.modules['_real_stdlib_socket'] = _real_socket_mod
_spec.loader.exec_module(_real_socket_mod)

# Replace ourselves with the real socket module
sys.modules[__name__] = _real_socket_mod
